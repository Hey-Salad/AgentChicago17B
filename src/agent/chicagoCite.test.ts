import { describe, expect, it } from './testHarness'
import {
  formatChicagoBibliographyEntry,
  formatChicagoDate,
  splitCiteMarkers,
} from './chicagoCite'

describe('chicagoCite', () => {
  it('formats Chicago dates', () => {
    expect(formatChicagoDate('2024-03-15T12:00:00.000Z')).toBe(
      'March 15, 2024',
    )
  })

  it('formats a bibliography entry without author', () => {
    const entry = formatChicagoBibliographyEntry({
      id: 's1',
      title: 'Open-source research agent patterns',
      publisher: 'Secondary Notes',
      publishedAt: '2024-06-01T00:00:00.000Z',
      url: 'https://example.com/patterns',
    })
    expect(entry.plain).toBe(
      '"Open-source research agent patterns." Secondary Notes. June 1, 2024. https://example.com/patterns.',
    )
  })

  it('splits note markers', () => {
    expect(splitCiteMarkers('Claim one.[1] Claim two.[2]')).toEqual([
      { type: 'text', value: 'Claim one.' },
      { type: 'note', n: 1 },
      { type: 'text', value: ' Claim two.' },
      { type: 'note', n: 2 },
    ])
  })
})
