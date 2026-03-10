import z from "zod"
import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { Log } from "@/util/log"

export namespace PluginSelect {
  const log = Log.create({ service: "plugin-select" })

  const pending = new Map<
    string,
    {
      title: string
      options: { label: string; value: string; isDefault?: boolean }[]
      resolve: (value: string | null) => void
    }
  >()

  export const Event = {
    Asked: BusEvent.define(
      "plugin_select.asked",
      z.object({
        requestID: z.string(),
        title: z.string(),
        options: z.array(z.object({ label: z.string(), value: z.string(), isDefault: z.boolean().optional() })),
      }),
    ),
    Replied: BusEvent.define(
      "plugin_select.replied",
      z.object({
        requestID: z.string(),
        value: z.string().nullable(),
      }),
    ),
  }

  export function ask(
    title: string,
    options: { label: string; value: string; isDefault?: boolean }[],
  ): Promise<string | null> {
    const id = crypto.randomUUID()
    log.info("ask", { requestID: id, count: options.length })
    return new Promise<string | null>((resolve) => {
      pending.set(id, { title, options, resolve })
      Bus.publish(Event.Asked, { requestID: id, title, options })
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id)
          resolve(null)
        }
      }, 60000)
    })
  }

  export function reply(requestID: string, value: string | null) {
    const entry = pending.get(requestID)
    if (!entry) return false
    log.info("reply", { requestID, value })
    pending.delete(requestID)
    entry.resolve(value)
    Bus.publish(Event.Replied, { requestID, value })
    return true
  }

  export function list() {
    return Array.from(pending.entries()).map(([id, entry]) => ({
      requestID: id,
      title: entry.title,
      options: entry.options,
    }))
  }
}
