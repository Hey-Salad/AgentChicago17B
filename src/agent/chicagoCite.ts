import type { Source } from './types'

/**
 * Chicago Manual of Style, 17th ed. — notes-bibliography helpers.
 * AgentChicago17B uses numbered notes in prose ([1]) + a Bibliography list.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** Format an ISO / parseable date as Chicago “Month Day, Year”. */
export function formatChicagoDate(value?: string): string | undefined {
  if (!value?.trim()) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    // Already human-readable (pass through lightly cleaned)
    return value.trim()
  }
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

/**
 * Bibliography entry for a secondary web / report source (author unknown).
 * Example: "Title." *Publisher*. January 2, 2024. https://example.com.
 */
export function formatChicagoBibliographyEntry(source: Source): {
  plain: string
  title: string
  publisher?: string
  date?: string
  url?: string
} {
  const title = source.title.trim() || 'Untitled source'
  const publisher = source.publisher?.trim() || undefined
  const date = formatChicagoDate(source.publishedAt)
  const url = source.url?.trim() || undefined

  let plain = `"${title}."`
  if (publisher) plain += ` ${publisher}.`
  if (date) plain += ` ${date}.`
  if (url) plain += ` ${url}.`
  // Ensure terminal period once
  plain = plain.replace(/\.\s*\./g, '.').trim()
  if (!plain.endsWith('.')) plain += '.'

  return { plain, title, publisher, date, url }
}

/** Split prose on Chicago-style note markers like [1]. */
export function splitCiteMarkers(text: string): Array<
  { type: 'text'; value: string } | { type: 'note'; n: number }
> {
  const parts = text.split(/(\[\d+\])/g).filter((p) => p.length > 0)
  return parts.map((part) => {
    const match = /^\[(\d+)\]$/.exec(part)
    if (!match) return { type: 'text' as const, value: part }
    return { type: 'note' as const, n: Number(match[1]) }
  })
}
