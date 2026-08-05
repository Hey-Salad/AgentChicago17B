import { formatChicagoBibliographyEntry } from '../agent/chicagoCite'
import type { ResearchBrief } from '../agent'

interface SourceListProps {
  brief: ResearchBrief
}

export function SourceList({ brief }: SourceListProps) {
  if (brief.sources.length === 0) return null

  return (
    <section className="sources-section" aria-labelledby="bibliography-heading">
      <div className="section-head">
        <div>
          <h2 id="bibliography-heading">Bibliography</h2>
          <p>Chicago Manual of Style, 17th ed. (notes-bibliography).</p>
        </div>
      </div>

      <ol className="source-list bibliography-list">
        {brief.sources.map((source, index) => {
          const n = index + 1
          const entry = formatChicagoBibliographyEntry(source)
          return (
            <li key={source.id} id={`bib-${n}`}>
              <span className="source-index" aria-hidden="true">
                {String(n).padStart(2, '0')}
              </span>
              <div className="bib-entry">
                <p className="bib-plain">
                  <span className="bib-title">“{entry.title}.”</span>
                  {entry.publisher ? (
                    <>
                      {' '}
                      <cite className="bib-publisher">{entry.publisher}</cite>.
                    </>
                  ) : null}
                  {entry.date ? <> {entry.date}.</> : null}
                  {entry.url ? (
                    <>
                      {' '}
                      <a href={entry.url} target="_blank" rel="noreferrer">
                        {entry.url}
                      </a>
                      .
                    </>
                  ) : null}
                </p>
                {source.excerpt ? (
                  <p className="bib-excerpt">{source.excerpt}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>

      {brief.angles.length > 0 ? (
        <div className="angles">
          <h3>Research angles</h3>
          <ul>
            {brief.angles.map((angle) => (
              <li key={angle.id}>
                <strong>{angle.label}</strong>
                <span>{angle.query}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
