// Minimal markdown-ish renderer for lesson concept copy (## headers, **bold**, blank-line paragraphs).
// Intentionally not a full markdown library — content is authored by us, not arbitrary user input,
// and the format is deliberately simple (see docs/CONTENT_AUTHORING.md).
export default function ConceptCard({ markdown }: { markdown: string }) {
  const blocks = markdown.split('\n\n')

  return (
    <div className="flex flex-col gap-4 text-left">
      {blocks.map((block, i) => {
        if (block.startsWith('## ')) {
          return (
            <h2 key={i} className="text-xl font-semibold text-slate-900">
              {block.slice(3)}
            </h2>
          )
        }
        const parts = block.split(/(\*\*[^*]+\*\*)/g)
        return (
          <p key={i} className="leading-relaxed text-slate-700">
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{part}</span>
              ),
            )}
          </p>
        )
      })}
    </div>
  )
}
