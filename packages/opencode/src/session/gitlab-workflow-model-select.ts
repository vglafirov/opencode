import z from "zod"
import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { Log } from "@/util/log"

export namespace GitLabWorkflowModelSelect {
  const log = Log.create({ service: "gitlab-workflow-model-select" })

  const pending = new Map<
    string,
    {
      models: { name: string; ref: string; isDefault?: boolean }[]
      resolve: (ref: string | null) => void
    }
  >()

  export const Event = {
    Asked: BusEvent.define(
      "gitlab_workflow_model_select.asked",
      z.object({
        requestID: z.string(),
        models: z.array(z.object({ name: z.string(), ref: z.string(), isDefault: z.boolean().optional() })),
      }),
    ),
    Replied: BusEvent.define(
      "gitlab_workflow_model_select.replied",
      z.object({
        requestID: z.string(),
        ref: z.string().nullable(),
      }),
    ),
  }

  export function ask(models: { name: string; ref: string; isDefault?: boolean }[]): Promise<string | null> {
    const id = crypto.randomUUID()
    log.info("ask", { requestID: id, count: models.length })
    return new Promise<string | null>((resolve) => {
      pending.set(id, { models, resolve })
      Bus.publish(Event.Asked, { requestID: id, models })
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id)
          resolve(null)
        }
      }, 60000)
    })
  }

  export function reply(requestID: string, ref: string | null) {
    const entry = pending.get(requestID)
    if (!entry) return false
    log.info("reply", { requestID, ref })
    pending.delete(requestID)
    entry.resolve(ref)
    Bus.publish(Event.Replied, { requestID, ref })
    return true
  }

  export function list() {
    return Array.from(pending.entries()).map(([id, entry]) => ({
      requestID: id,
      models: entry.models,
    }))
  }
}
