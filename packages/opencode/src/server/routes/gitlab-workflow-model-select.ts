import { Hono } from "hono"
import { describeRoute, validator } from "hono-openapi"
import { resolver } from "hono-openapi"
import z from "zod"
import { errors } from "../error"
import { lazy } from "../../util/lazy"
import { GitLabWorkflowModelSelect } from "../../session/gitlab-workflow-model-select"

export const GitLabWorkflowModelSelectRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "List pending workflow model selections",
        operationId: "gitlab_workflow_model_select.list",
        responses: {
          200: {
            description: "List of pending selections",
            content: {
              "application/json": {
                schema: resolver(z.array(z.object({ requestID: z.string(), models: z.array(z.any()) }))),
              },
            },
          },
        },
      }),
      async (c) => {
        return c.json(GitLabWorkflowModelSelect.list())
      },
    )
    .post(
      "/ask",
      describeRoute({
        summary: "Ask user to select a workflow model",
        operationId: "gitlab_workflow_model_select.ask",
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
          models: z.array(z.object({ name: z.string(), ref: z.string(), isDefault: z.boolean().optional() })),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        const ref = await GitLabWorkflowModelSelect.ask(body.models)
        return c.json({ ref })
      },
    )
    .post(
      "/:requestID/reply",
      describeRoute({
        summary: "Reply to workflow model selection",
        operationId: "gitlab_workflow_model_select.reply",
        responses: {
          200: {
            description: "Reply accepted",
            content: { "application/json": { schema: resolver(z.boolean()) } },
          },
          ...errors(404),
        },
      }),
      validator("param", z.object({ requestID: z.string() })),
      validator("json", z.object({ ref: z.string().nullable() })),
      async (c) => {
        const params = c.req.valid("param")
        const body = c.req.valid("json")
        const ok = GitLabWorkflowModelSelect.reply(params.requestID, body.ref)
        if (!ok) return c.json(false, 404)
        return c.json(true)
      },
    ),
)
