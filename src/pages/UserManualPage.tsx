import { isValidElement, useMemo, useState, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import manualSource from '../../../docs/client-user-manual-ar.md?raw'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { manualHeadingId, manualSectionsMatching, parseManual } from '../lib/userManual'

const manual = parseManual(manualSource)

function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children)
  return ''
}

function scrollToHeading(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-on-surface">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2
      id={manualHeadingId(nodeText(children))}
      className="scroll-mt-24 text-lg font-bold text-on-surface"
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-on-surface">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-relaxed text-on-surface">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-xs pe-5 text-sm leading-relaxed text-on-surface">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-xs pe-5 text-sm leading-relaxed text-on-surface">{children}</ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-s-4 border-primary/40 bg-primary/5 px-md py-sm text-sm text-on-surface-variant">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => {
    if (href?.startsWith('#')) {
      const id = decodeURIComponent(href.slice(1))
      return (
        <button
          type="button"
          className="text-primary underline-offset-2 hover:underline"
          onClick={() => scrollToHeading(id)}
        >
          {children}
        </button>
      )
    }
    if (href?.startsWith('http')) {
      return (
        <a href={href} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
          {children}
        </a>
      )
    }
    return <span>{children}</span>
  },
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-outline-variant bg-surface-container-low px-sm py-xs text-right font-semibold text-on-surface">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-outline-variant px-sm py-xs align-top text-on-surface">{children}</td>
  ),
  code: ({ children }) => (
    <code className="rounded bg-surface-container-high px-1 py-0.5 text-xs">{children}</code>
  ),
  hr: () => <hr className="border-outline-variant" />,
}

export function UserManualPage() {
  const [search, setSearch] = useState('')
  const sections = useMemo(
    () => manualSectionsMatching(manual.sections, search),
    [search],
  )
  const showPreamble = search.trim() === ''

  return (
    <SalesPageShell
      title="دليل الاستخدام"
      subtitle="دليل موظفي النظام. يظهر لمدير النظام ومدير الإدارة ومدير الفرع."
    >
      <div className="grid gap-md lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav className="h-fit rounded-xl border border-outline-variant bg-surface-container-lowest p-sm lg:sticky lg:top-4">
          <p className="px-sm py-xs text-xs font-semibold text-on-surface-variant">أقسام الدليل</p>
          <div className="max-h-[50vh] space-y-0.5 overflow-y-auto lg:max-h-[calc(100vh-8rem)]">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className="block w-full rounded-lg px-sm py-xs text-right text-sm text-on-surface hover:bg-surface-container-low"
                onClick={() => scrollToHeading(section.id)}
              >
                {section.title}
              </button>
            ))}
            {sections.length === 0 && (
              <p className="px-sm py-xs text-sm text-on-surface-variant">لا توجد أقسام مطابقة.</p>
            )}
          </div>
        </nav>

        <div className="min-w-0 space-y-md">
          <div className="relative">
            <Icon
              name="search"
              size={20}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث في الدليل"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-sm pe-md ps-10 text-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          {showPreamble && manual.preamble && (
            <article className="space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {manual.preamble}
              </ReactMarkdown>
            </article>
          )}

          {sections.map((section) => (
            <article
              key={section.id}
              className="space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {section.markdown}
              </ReactMarkdown>
            </article>
          ))}

          {sections.length === 0 && (
            <p className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-sm text-on-surface-variant">
              لا توجد نتائج لهذا البحث.
            </p>
          )}
        </div>
      </div>
    </SalesPageShell>
  )
}
