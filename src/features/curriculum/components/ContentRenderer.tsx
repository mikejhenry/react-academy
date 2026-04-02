import type { ContentBlock } from '@/lib/types'

interface ContentRendererProps {
  blocks: ContentBlock[]
}

export function ContentRenderer({ blocks }: ContentRendererProps) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  )
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'text':
      return <p className="text-text-base leading-relaxed">{block.content}</p>

    case 'heading':
      return <h3 className="text-xl font-bold text-text-base mt-2">{block.content}</h3>

    case 'code':
      return (
        <div>
          <div className="flex items-center justify-between bg-bg-secondary border border-border rounded-t-theme px-3 py-1">
            <span className="text-xs text-text-muted font-mono">{block.language}</span>
          </div>
          <pre className="bg-bg-secondary border border-t-0 border-border rounded-b-theme p-4 overflow-x-auto text-sm font-mono text-text-base">
            <code>{block.content}</code>
          </pre>
        </div>
      )

    case 'list':
      return (
        <ul className="list-disc list-inside flex flex-col gap-1.5 pl-2">
          {block.items.map((item, i) => (
            <li key={i} className="text-text-base leading-relaxed">{item}</li>
          ))}
        </ul>
      )

    case 'tip':
      return (
        <div className="border-l-4 border-primary bg-bg-secondary px-4 py-3 rounded-r-theme">
          <p className="text-text-base text-sm">
            <span className="font-semibold text-primary">Tip: </span>
            {block.content}
          </p>
        </div>
      )

    case 'warning':
      return (
        <div className="border-l-4 border-warning bg-bg-secondary px-4 py-3 rounded-r-theme">
          <p className="text-text-base text-sm">
            <span className="font-semibold text-warning">⚠ Warning: </span>
            {block.content}
          </p>
        </div>
      )

    default:
      return null
  }
}
