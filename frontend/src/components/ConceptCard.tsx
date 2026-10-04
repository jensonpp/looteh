// Minimal markdown-ish renderer for lesson concept copy (## headers, **bold**, blank-line
// paragraphs, - lists). Intentionally not a full markdown library — content is authored by
// us, not arbitrary user input, and the format is deliberately simple (see docs/CONTENT_AUTHORING.md).

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, j) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={`${keyPrefix}-${j}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${j}`}>{part}</span>
    ),
  )
}

export default function ConceptCard({ markdown }: { markdown: string }) {
  const blocks = markdown.split('\n\n')

  return (
    <div className="flex flex-col gap-4 text-left">
      {blocks.map((block, i) => {
        if (block.startsWith('## ')) {
          return (
            <h2 key={i} className="font-display text-xl font-semibold text-white">
              {block.slice(3)}
            </h2>
          )
        }
        const lines = block.split('\n')
        if (lines.length > 0 && lines.every((line) => line.startsWith('- '))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 leading-relaxed text-slate-300">
              {lines.map((line, j) => (
                <li key={j}>{renderInline(line.slice(2), `li-${i}-${j}`)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="leading-relaxed text-slate-300">
            {renderInline(block, `p-${i}`)}
          </p>
        )
      })}
    </div>
  )
}
