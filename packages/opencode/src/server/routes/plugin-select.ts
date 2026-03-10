import { Hono } from "hono"
import { describeRoute, validator } from "hono-openapi"
import { resolver } from "hono-openapi"
import z from "zod"
import { errors } from "../error"
import { lazy } from "../../util/lazy"
import { PluginSelect } from "../../session/plugin-select"

export const PluginSelectRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "List pending plugin selections",
        operationId: "plugin_select.list",
        responses: {
          200: {
            description: "List of pending selections",
            content: {
              "application/json": {
                schema: resolver(
                  z.array(
                    z.object({
                      requestID: z.string(),
                      title: z.string(),
                      options: z.array(z.any()),
                    }),
                  ),
                ),
              },
            },
          },
        },
      }),
      async (c) => {
        return c.json(PluginSelect.list())
      },
    )
    .post(
      "/ask",
      describeRoute({
        summary: "Ask user to select from options",
        operationId: "plugin_select.ask",
        responses: {
          200: {
            description: "Selection result",
            content: { "application/json": { schema: resolver(z.any()) } },
          },
        },
      }),
      validator(
        "json",
        z.object({
          title: z.string(),
          options: z.array(z.object({ label: z.string(), value: z.string(), isDefault: z.boolean().optional() })),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        const value = await PluginSelect.ask(body.title, body.options)
        return c.json({ value })
      },
    )
    .post(
      "/:requestID/reply",
      describeRoute({
        summary: "Reply to plugin selection",
        operationId: "plugin_select.reply",
        responses: {
          200: {
            description: "Reply accepted",
            content: { "application/json": { schema: resolver(z.boolean()) } },
          },
          ...errors(404),
        },
      }),
      validator("param", z.object({ requestID: z.string() })),
      validator("json", z.object({ value: z.string().nullable() })),
      async (c) => {
        const params = c.req.valid("param")
        const body = c.req.valid("json")
        const ok = PluginSelect.reply(params.requestID, body.value)
        if (!ok) return c.json(false, 404)
        return c.json(true)
      },
    ),
)
