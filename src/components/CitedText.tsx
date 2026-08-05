import { splitCiteMarkers } from '../agent/chicagoCite'

interface CitedTextProps {
  text: string
  sourceCount: number
}

/** Renders prose with Chicago note markers [1] as linked superscripts. */
export function CitedText({ text, sourceCount }: CitedTextProps) {
  const parts = splitCiteMarkers(text)

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={`t-${index}`}>{part.value}</span>
        }
        if (part.n < 1 || part.n > sourceCount) {
          return <span key={`n-${index}`}>[{part.n}]</span>
        }
        return (
          <sup key={`n-${index}`} className="cite-ref">
            <a href={`#bib-${part.n}`} title={`Bibliography note ${part.n}`}>
              {part.n}
            </a>
          </sup>
        )
      })}
    </>
  )
}
