import { DialogSelect } from "@tui/ui/dialog-select"

export function DialogPluginSelect(props: {
  requestID: string
  title: string
  options: { label: string; value: string; isDefault?: boolean }[]
  onReply: (value: string | null) => void
}) {
  const items = () =>
    props.options.map((m) => ({
      title: m.isDefault ? `${m.label} (default)` : m.label,
      value: m.value,
      onSelect: () => {
        props.onReply(m.value)
      },
    }))

  return <DialogSelect<string> options={items()} title={props.title} />
}
