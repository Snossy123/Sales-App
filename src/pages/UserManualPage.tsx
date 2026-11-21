import { isValidElement, useMemo, useState, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import {
  countManualMatches,
  manualHeadingId,
  manualSectionsMatching,
  parseManual,
} from '../lib/userManual'

const manualModules = import.meta.glob('../../docs/client-user-manual-ar.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const manualSource = manualModules['../../docs/client-user-manual-ar.md'] ?? ''
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

function buildMarkdownComponents(
  copiedId: string | null,
  onCopyAnchor: (id: string) => void,
): Components {
  return {
    h1: ({ children }) => (
      <h1 className="mb-3 text-xl font-bold tracking-tight text-on-surface">{children}</h1>
    ),
    h2: ({ children }) => {
      const id = manualHeadingId(nodeText(children))
      const isCopied = copiedId === id
      return (
        <div className="group mb-5 flex items-center justify-between gap-4 border-b-2 border-primary/15 pb-3.5">
          <h2 id={id} className="scroll-mt-24 text-lg font-bold text-on-surface sm:text-xl">
            {children}
          </h2>
          <button
            type="button"
            onClick={() => onCopyAnchor(id)}
            title="نسخ رابط القسم"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant/70 bg-surface-container-low/70 px-2.5 py-1.5 text-xs font-medium text-on-surface-variant transition hover:border-primary hover:bg-primary/5 hover:text-primary print:hidden"
          >
            <Icon name={isCopied ? 'check' : 'link'} size={14} />
            <span>{isCopied ? 'تم النسخ' : 'رابط'}</span>
          </button>
        </div>
      )
    },
    h3: ({ children }) => {
      const id = manualHeadingId(nodeText(children))
      return (
        <h3
          id={id}
          className="mt-7 mb-3 scroll-mt-24 border-t border-outline-variant/40 pt-5 text-base font-bold text-primary first:mt-2 first:border-t-0 first:pt-0"
        >
          {children}
        </h3>
      )
    },
    h4: ({ children }) => (
      <h4 className="mt-5 mb-2 inline-flex items-center rounded-md bg-surface-container-low px-2.5 py-1 text-xs font-bold text-on-surface">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="my-2.5 text-sm leading-7 text-on-surface">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="my-3 list-outside list-disc space-y-2 pr-6 text-sm leading-7 text-on-surface">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-3 list-outside list-decimal space-y-2.5 pr-6 text-sm leading-7 text-on-surface">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="pl-1 marker:font-semibold marker:text-primary/70">{children}</li>
    ),
    strong: ({ children }) => (
      <strong className="font-bold text-on-surface">{children}</strong>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-3 space-y-1.5 rounded-xl border-r-4 border-primary bg-primary/[0.04] px-4 py-3 text-sm leading-7 text-on-surface">
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => {
      if (href?.startsWith('#')) {
        const id = decodeURIComponent(href.slice(1))
        return (
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => scrollToHeading(id)}
          >
            {children}
          </button>
        )
      }
      if (href?.startsWith('http')) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {children}
          </a>
        )
      }
      return <span>{children}</span>
    },
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-xl border border-outline-variant/70 shadow-2xs">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-surface-container-low/90">{children}</thead>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-outline-variant/50 transition-colors last:border-b-0 odd:bg-surface-container-lowest even:bg-surface-container-low/25 hover:bg-primary/[0.04]">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="border-l border-outline-variant/50 px-3.5 py-2.5 text-right text-xs font-bold whitespace-nowrap text-on-surface last:border-l-0">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-l border-outline-variant/40 px-3.5 py-2.5 align-top text-xs leading-6 text-on-surface last:border-l-0">
        {children}
      </td>
    ),
    pre: ({ children }) => (
      <pre
        dir="ltr"
        className="my-3 overflow-x-auto rounded-xl border border-outline-variant/70 bg-slate-900 p-4 text-left text-xs leading-6 text-slate-100"
      >
        {children}
      </pre>
    ),
    code: ({ children, className }) => {
      const isBlock = Boolean(className)
      if (isBlock) {
        return <code className={className}>{children}</code>
      }
      return (
        <code className="mx-0.5 inline rounded-md border border-outline-variant/50 bg-surface-container-low px-1.5 py-0.5 font-mono text-[12px] font-medium text-on-surface [unicode-bidi:isolate]">
          {children}
        </code>
      )
    },
    hr: () => <hr className="my-6 border-outline-variant/50" />,
  }
}

export function UserManualPage() {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all')
  const [activeSectionId, setActiveSectionId] = useState<string>(manual.sections[0]?.id ?? '')
  const [expandedTocIds, setExpandedTocIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(manual.sections.slice(0, 1).map((s) => [s.id, true])),
  )
  const [mobileTocOpen, setMobileTocOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const trimmedSearch = search.trim()

  const matchingSections = useMemo(
    () => manualSectionsMatching(manual.sections, search),
    [search],
  )

  const matchCountsById = useMemo(() => {
    if (!trimmedSearch) return {} as Record<string, number>
    return Object.fromEntries(
      matchingSections.map((section) => [section.id, countManualMatches(section, trimmedSearch)]),
    )
  }, [matchingSections, trimmedSearch])

  const totalMatches = useMemo(
    () => Object.values(matchCountsById).reduce((acc, n) => acc + n, 0),
    [matchCountsById],
  )

  const totalSubsections = useMemo(
    () => manual.sections.reduce((acc, s) => acc + s.subsections.length, 0),
    [],
  )

  const visibleSections = useMemo(() => {
    if (trimmedSearch || viewMode === 'all') return matchingSections
    const selected = matchingSections.find((s) => s.id === activeSectionId)
    return selected ? [selected] : matchingSections.slice(0, 1)
  }, [matchingSections, trimmedSearch, viewMode, activeSectionId])

  const activeIndex = useMemo(
    () => manual.sections.findIndex((s) => s.id === (visibleSections[0]?.id ?? activeSectionId)),
    [visibleSections, activeSectionId],
  )

  const handleCopyAnchor = (id: string) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(id)}`
      void navigator.clipboard.writeText(url)
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000)
  }

  const handleSelectSection = (sectionId: string, targetHeadingId?: string) => {
    setActiveSectionId(sectionId)
    setExpandedTocIds((prev) => ({ ...prev, [sectionId]: true }))
    setMobileTocOpen(false)
    const scrollTarget = targetHeadingId ?? sectionId
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => scrollToHeading(scrollTarget))
    }
  }

  const toggleTocExpand = (sectionId: string) => {
    setExpandedTocIds((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const markdownComponents = useMemo(
    () => buildMarkdownComponents(copiedId, handleCopyAnchor),
    [copiedId],
  )

  const showPreamble = trimmedSearch === '' && (viewMode === 'all' || activeIndex <= 0)
  const allExpanded = manual.sections.every((s) => expandedTocIds[s.id])

  return (
    <SalesPageShell
      title="دليل الاستخدام والمرجع التفصيلي الشامل"
      subtitle="المرجع الوظيفي والتقني الكامل لنظام GPS للمبيعات — الأدوار والصلاحيات، المسارات، الكيانات، دورات الحياة، الحسابات، والأوفلاين."
    >
      {/* Top summary & controls toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/70 bg-surface-container-lowest px-4 py-3 shadow-2xs print:hidden">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary/10 px-3 font-semibold text-primary">
            <Icon name="menu_book" size={15} />
            <span>{manual.sections.length} أقسام رئيسية</span>
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-container-low px-3 font-medium text-on-surface-variant">
            <Icon name="list" size={15} />
            <span>{totalSubsections} محوراً فرعياً</span>
          </span>
          {trimmedSearch && (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 font-semibold text-on-primary">
              <span>
                {totalMatches} نتيجة في {matchingSections.length} قسم
              </span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileTocOpen((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant/70 bg-surface-container-low px-3 text-xs font-medium text-on-surface transition hover:border-primary lg:hidden"
          >
            <Icon name="toc" size={16} />
            <span>{mobileTocOpen ? 'إخفاء الفهرس' : 'فهرس الأقسام'}</span>
          </button>

          <div className="inline-flex h-9 items-center overflow-hidden rounded-lg border border-outline-variant/70 bg-surface-container-low p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`h-full rounded-md px-3 font-semibold transition ${
                viewMode === 'all'
                  ? 'bg-primary text-on-primary shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              عرض الكل
            </button>
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`h-full rounded-md px-3 font-semibold transition ${
                viewMode === 'single'
                  ? 'bg-primary text-on-primary shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              قسم واحد
            </button>
          </div>

          <button
            type="button"
            onClick={() => typeof window !== 'undefined' && window.print()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant/70 bg-surface-container-lowest px-3 text-xs font-semibold text-on-surface transition hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            <Icon name="print" size={16} />
            <span>طباعة / PDF</span>
          </button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[19.5rem_minmax(0,1fr)]">
        {/* Sticky Hierarchical Sidebar TOC */}
        <nav
          aria-label="فهرس الدليل"
          className={`${
            mobileTocOpen ? 'block' : 'hidden'
          } rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-4 shadow-2xs lg:sticky lg:top-20 lg:block print:hidden`}
        >
          <div className="mb-3 flex items-center justify-between border-b border-outline-variant/40 pb-2.5">
            <p className="text-xs font-bold text-on-surface">أقسام المرجع</p>
            <button
              type="button"
              onClick={() => {
                setExpandedTocIds(
                  Object.fromEntries(manual.sections.map((s) => [s.id, !allExpanded])),
                )
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              {allExpanded ? 'طي الكل' : 'توسيع الكل'}
            </button>
          </div>

          <div className="max-h-[55vh] space-y-1.5 overflow-y-auto pl-1 lg:max-h-[calc(100vh-13rem)]">
            {matchingSections.map((section) => {
              const isActive = activeSectionId === section.id
              const isExpanded = Boolean(expandedTocIds[section.id]) || Boolean(trimmedSearch)
              const matchCount = matchCountsById[section.id]

              return (
                <div key={section.id} className="space-y-1">
                  <div
                    className={`flex items-start gap-1.5 rounded-lg px-2.5 py-2 transition ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface hover:bg-surface-container-low/70'
                    }`}
                  >
                    {section.subsections.length > 0 && (
                      <button
                        type="button"
                        aria-label="توسيع القسم"
                        onClick={() => toggleTocExpand(section.id)}
                        className="mt-0.5 shrink-0 rounded p-0.5 text-on-surface-variant transition hover:text-primary"
                      >
                        <Icon
                          name={isExpanded ? 'expand_more' : 'chevron_left'}
                          size={16}
                        />
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex-1 text-right text-xs font-semibold leading-5"
                      onClick={() => handleSelectSection(section.id)}
                    >
                      {section.title}
                    </button>
                    {matchCount ? (
                      <span className="mt-0.5 shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                        {matchCount}
                      </span>
                    ) : null}
                  </div>

                  {isExpanded && section.subsections.length > 0 && (
                    <div className="mr-4 space-y-0.5 border-r-2 border-outline-variant/50 pr-3">
                      {section.subsections.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleSelectSection(section.id, sub.id)}
                          className="block w-full rounded-md px-2 py-1.5 text-right text-xs leading-5 text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary"
                        >
                          {sub.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {matchingSections.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-on-surface-variant">
                لا توجد أقسام مطابقة.
              </p>
            )}
          </div>
        </nav>

        {/* Main Specification Content */}
        <div className="min-w-0 space-y-5">
          {/* RTL Search Input */}
          <div className="relative print:hidden">
            <Icon
              name="search"
              size={20}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث في الدليل (مثال: صلاحية، قسط، مخزون، أوفلاين، استرداد، ZKTeco)..."
              className="w-full rounded-xl border border-outline-variant/70 bg-surface-container-lowest py-3 pr-11 pl-10 text-sm text-on-surface shadow-2xs outline-none transition placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            {search && (
              <button
                type="button"
                aria-label="مسح البحث"
                onClick={() => setSearch('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
              >
                <Icon name="close" size={18} />
              </button>
            )}
          </div>

          {showPreamble && manual.preamble && (
            <article className="rounded-xl border border-primary/20 bg-surface-container-lowest p-6 shadow-2xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {manual.preamble}
              </ReactMarkdown>
            </article>
          )}

          {visibleSections.map((section) => (
            <article
              key={section.id}
              className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-6 shadow-2xs"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {section.markdown}
              </ReactMarkdown>
            </article>
          ))}

          {viewMode === 'single' && !trimmedSearch && visibleSections.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/70 bg-surface-container-lowest px-4 py-3 shadow-2xs print:hidden">
              <button
                type="button"
                disabled={activeIndex <= 0}
                onClick={() => {
                  const prev = manual.sections[activeIndex - 1]
                  if (prev) handleSelectSection(prev.id)
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant/70 px-3 text-xs font-semibold text-on-surface transition hover:border-primary hover:text-primary disabled:opacity-40"
              >
                <Icon name="arrow_forward" size={16} />
                <span>القسم السابق</span>
              </button>
              <span className="text-xs font-medium text-on-surface-variant">
                القسم {activeIndex + 1} من {manual.sections.length}
              </span>
              <button
                type="button"
                disabled={activeIndex >= manual.sections.length - 1}
                onClick={() => {
                  const next = manual.sections[activeIndex + 1]
                  if (next) handleSelectSection(next.id)
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant/70 px-3 text-xs font-semibold text-on-surface transition hover:border-primary hover:text-primary disabled:opacity-40"
              >
                <span>القسم التالي</span>
                <Icon name="arrow_back" size={16} />
              </button>
            </div>
          )}

          {visibleSections.length === 0 && (
            <div className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-8 text-center shadow-2xs">
              <p className="text-sm font-semibold text-on-surface">لا توجد نتائج مطابقة لهذا البحث.</p>
              <p className="mt-1.5 text-xs text-on-surface-variant">
                جرّب كلمة مفتاحية أخرى مثل: الصلاحيات، المسارات، الأقساط، المخزون، أو المزامنة.
              </p>
            </div>
          )}
        </div>
      </div>
    </SalesPageShell>
  )
}
