export interface ManualSubsection {
  id: string
  title: string
}

export interface ManualSection {
  id: string
  title: string
  markdown: string
  subsections: ManualSubsection[]
}

export interface ParsedManual {
  preamble: string
  sections: ManualSection[]
}

/** GitHub-style heading slug so in-manual anchor links match rendered headings. */
export function manualHeadingId(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
    .trim()
    .replace(/\s/g, '-')
}

export function parseManual(source: string): ParsedManual {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const preamble: string[] = []
  const sections: ManualSection[] = []
  let current: { title: string; lines: string[]; subsections: ManualSubsection[] } | null = null

  for (const line of lines) {
    const h2 = /^## (.+)$/.exec(line)
    if (h2) {
      if (current) {
        sections.push(toSection(current.title, current.lines, current.subsections))
      }
      current = { title: h2[1].trim(), lines: [line], subsections: [] }
      continue
    }

    if (current) {
      const h3 = /^### (.+)$/.exec(line)
      if (h3) {
        const subTitle = h3[1].trim()
        current.subsections.push({
          id: manualHeadingId(subTitle),
          title: subTitle,
        })
      }
      current.lines.push(line)
    } else {
      preamble.push(line)
    }
  }

  if (current) {
    sections.push(toSection(current.title, current.lines, current.subsections))
  }

  return {
    preamble: preamble.join('\n').trim(),
    sections,
  }
}

function toSection(
  title: string,
  lines: string[],
  subsections: ManualSubsection[],
): ManualSection {
  return {
    id: manualHeadingId(title),
    title,
    markdown: lines.join('\n').trim(),
    subsections,
  }
}

export function manualSectionsMatching(sections: ManualSection[], query: string): ManualSection[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return sections
  return sections.filter((section) =>
    `${section.title}\n${section.markdown}`.toLowerCase().includes(needle),
  )
}

export function countManualMatches(section: ManualSection, query: string): number {
  const needle = query.trim().toLowerCase()
  if (!needle) return 0
  const haystack = section.markdown.toLowerCase()
  let count = 0
  let pos = 0
  while (true) {
    const found = haystack.indexOf(needle, pos)
    if (found === -1) break
    count += 1
    pos = found + needle.length
  }
  return count
}
