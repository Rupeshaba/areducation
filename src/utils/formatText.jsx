// Renders plain text with lightweight formatting support:
//   \n         -> line break
//   **bold**   -> <strong>bold</strong>
// Used for question, option, and explanation text across the quiz pages.
export default function formatText(text) {
  if (text === null || text === undefined) return text
  const lines = String(text).split('\n')

  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== '')
    return (
      <span key={lineIdx}>
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return <strong key={partIdx}>{part.slice(2, -2)}</strong>
          }
          return <span key={partIdx}>{part}</span>
        })}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    )
  })
}
