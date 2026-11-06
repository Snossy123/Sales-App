export interface ManualSection {
  id: string
  title: string
  markdown: string
}

export interface ParsedManual {
  preamble: string
  sections: ManualSection[]
}

/** GitHub-style heading slug so in-manual links like `#4-الآعدادات--…` still match. */
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
  let current: { title: string; lines: string[] } | null = null

  for (const line of lines) {
    const heading = /^## (.+)$/.exec(line)
    if (heading) {
      if (current) {
        sections.push(toSection(current.title, current.lines))
      }
      current = { title: heading[1].trim(), lines: [line] }
      continue
    }
    if (current) current.lines.push(line)
    else preamble.push(line)
  }

  if (current) sections.push(toSection(current.title, current.lines))

  return {
    preamble: preamble.join('\n').trim(),
    sections,
  }
}

function toSection(title: string, lines: string[]): ManualSection {
  return {
    id: manualHeadingId(title),
    title,
    markdown: lines.join('\n').trim(),
  }
}

export function manualSectionsMatching(sections: ManualSection[], query: string): ManualSection[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return sections
  return sections.filter((section) =>
    `${section.title}\n${section.markdown}`.toLowerCase().includes(needle),
  )
}
