// Renders quiz text (question / options / explanation) with rich formatting
// support, so AI-generated content can use simple markup instead of plain text.
//
// SUPPORTED SYNTAX
// -----------------------------------------------------------------------
//   \n                line break
//   **text**          bold
//   __text__          underline
//   ____ (4+ _)       blank / fill-in-the-blank line
//   ^{exp} or ^x       superscript          e.g. x^{2}  ->  x²   ,  10^3
//   _{sub} or _2       subscript            e.g. H_{2}O ->  H₂O
//   \frac{a}{b}        stacked fraction     e.g. \frac{1}{2}
//   \sqrt{a}           square root          e.g. \sqrt{16}
//   \sqrt[n]{a}        nth root             e.g. \sqrt[3]{27}
// -----------------------------------------------------------------------
// Everything below is intentionally dependency-free (no KaTeX/MathJax) so it
// renders instantly and works for the vast majority of school/exam-level
// math (exponents, roots, fractions, chemical formulas, blanks, emphasis).

// One combined regex covering every inline token type. Order inside the
// alternation matters — more specific patterns are tried first so they don't
// get swallowed by a looser one (e.g. blank runs before underline).
//
// IMPORTANT: this must be created FRESH on every parseInline() call (see
// below) rather than shared as a single module-level "g" regex. A global
// regex keeps its scan position (lastIndex) on the object itself, and
// parseInline() calls itself recursively (for bold/underline content,
// fraction numerator/denominator, sqrt content, etc.). A shared regex's
// lastIndex would get reset by the inner recursive call, corrupting the
// outer loop's position and causing it to loop forever on the same match —
// freezing the page. A fresh regex per call keeps each call's scan state
// independent.
function createInlineRegex() {
  return /(_{4,})|(\*\*[^*]+\*\*)|(__[^_]+__)|(\\sqrt\[[^\]]+\]\{[^}]+\})|(\\sqrt\{[^}]+\})|(\\frac\{[^}]+\}\{[^}]+\})|(\^\{[^}]+\})|(\^\S)|(_\{[^}]+\})|(_\d)/g
}

let keySeed = 0
function nextKey() {
  keySeed += 1
  return `ft-${keySeed}`
}

// Parses a single line (no \n inside) into React nodes, handling bold,
// underline, blanks, superscript, subscript, fractions and roots.
function parseInline(text) {
  const nodes = []
  let lastIndex = 0
  let match

  const regex = createInlineRegex()
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]

    if (token.startsWith('____') || /^_{4,}$/.test(token)) {
      // Blank line for fill-in-the-blank questions. Width scales with the
      // number of underscores the AI/author used.
      const width = Math.min(Math.max(token.length, 4), 24) * 0.6
      nodes.push(
        <span
          key={nextKey()}
          className="inline-block align-baseline border-b-2 border-current"
          style={{ minWidth: `${width}em`, height: '1em' }}
        />
      )
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={nextKey()}>{parseInline(token.slice(2, -2))}</strong>)
    } else if (token.startsWith('__')) {
      nodes.push(<u key={nextKey()}>{parseInline(token.slice(2, -2))}</u>)
    } else if (token.startsWith('\\sqrt[')) {
      const m = token.match(/^\\sqrt\[([^\]]+)\]\{([^}]+)\}$/)
      nodes.push(renderRoot(m?.[1], m?.[2]))
    } else if (token.startsWith('\\sqrt{')) {
      const m = token.match(/^\\sqrt\{([^}]+)\}$/)
      nodes.push(renderRoot(null, m?.[1]))
    } else if (token.startsWith('\\frac{')) {
      const m = token.match(/^\\frac\{([^}]+)\}\{([^}]+)\}$/)
      nodes.push(renderFraction(m?.[1], m?.[2]))
    } else if (token.startsWith('^{')) {
      nodes.push(<sup key={nextKey()}>{parseInline(token.slice(2, -1))}</sup>)
    } else if (token.startsWith('^')) {
      nodes.push(<sup key={nextKey()}>{token.slice(1)}</sup>)
    } else if (token.startsWith('_{')) {
      nodes.push(<sub key={nextKey()}>{parseInline(token.slice(2, -1))}</sub>)
    } else if (token.startsWith('_')) {
      nodes.push(<sub key={nextKey()}>{token.slice(1)}</sub>)
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function renderFraction(num, den) {
  return (
    <span
      key={nextKey()}
      className="inline-flex flex-col items-center align-middle mx-0.5"
      style={{ verticalAlign: 'middle', lineHeight: 1.1, fontSize: '0.92em' }}
    >
      <span className="px-0.5 border-b-2 border-current">{parseInline(num || '')}</span>
      <span className="px-0.5">{parseInline(den || '')}</span>
    </span>
  )
}

function renderRoot(index, content) {
  return (
    <span key={nextKey()} className="inline-flex items-start align-middle whitespace-nowrap">
      {index && <sup className="mr-[-2px]" style={{ fontSize: '0.65em' }}>{index}</sup>}
      <span>√</span>
      <span className="border-t-2 border-current pl-0.5 ml-[-1px]">{parseInline(content || '')}</span>
    </span>
  )
}

export default function formatText(text) {
  if (text === null || text === undefined) return text
  const lines = String(text).split('\n')

  return lines.map((line, lineIdx) => (
    <span key={`line-${lineIdx}`}>
      {parseInline(line)}
      {lineIdx < lines.length - 1 && <br />}
    </span>
  ))
}
