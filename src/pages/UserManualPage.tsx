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
      <h1 className="text-xl font-bold tracking-tight text-on-surface">{children}</h1>
    ),
    h2: ({ children }) => {
      const id = manualHeadingId(nodeText(children))
      const isCopied = copiedId === id
      return (
        <div className="group flex items-center justify-between gap-sm border-b border-outline-variant pb-sm">
          <h2 id={id} className="scroll-mt-24 text-lg font-bold text-on-surface">
            {children}
          </h2>
          <button
            type="button"
            onClick={() => onCopyAnchor(id)}
            title="نسخ رابط القسم"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low px-xs py-1 text-xs text-on-surface-variant opacity-80 transition hover:border-primary hover:text-primary group-hover:opacity-100 print:hidden"
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
          className="scroll-mt-24 pt-sm text-base font-bold text-primary"
        >
          {children}
        </h3>
      )
    },
    h4: ({ children }) => (
      <h4 className="pt-xs text-sm font-bold text-on-surface">{children}</h4>
    ),
    p: ({ children }) => (
      <p className="text-sm leading-7 text-on-surface">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc space-y-1.5 pe-5 text-sm leading-7 text-on-surface">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal space-y-1.5 pe-5 text-sm leading-7 text-on-surface">{children}</ol>
    ),
    li: ({ children }) => <li className="marker:text-primary/70">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="rounded-lg border-s-4 border-primary bg-primary/5 px-md py-sm text-sm text-on-surface">
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
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            {children}
          </a>
        )
      }
      return <span>{children}</span>
    },
    table: ({ children }) => (
      <div className="my-xs overflow-x-auto rounded-lg border border-outline-variant">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-surface-container-low">{children}</thead>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-outline-variant/60 last:border-b-0 odd:bg-surface-container-lowest even:bg-surface-container-low/30 hover:bg-primary/5">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="border-e border-outline-variant/60 px-sm py-xs text-right text-xs font-bold text-on-surface last:border-e-0">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-e border-outline-variant/40 px-sm py-xs align-top text-xs leading-6 text-on-surface last:border-e-0">
        {children}
      </td>
    ),
    pre: ({ children }) => (
      <pre
        dir="ltr"
        className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-high p-sm text-left text-xs leading-6 text-on-surface"
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
        <code
          dir="ltr"
          className="inline-block rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-xs text-primary"
        >
          {children}
        </code>
      )
    },
    hr: () => <hr className="my-md border-outline-variant" />,
  }
}

export function UserManualPage() {
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all')
  const [activeSectionId, setActiveSectionId] = useState<string>(manual.sections[0]?.id ?? '')
  const [expandedTocIds, setExpandedTocIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(manual.sections.slice(0, 2).map((s) => [s.id, true])),
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

  return (
    <SalesPageShell
      title="دليل الاستخدام والمرجع التفصيلي الشامل"
      subtitle="المرجع الوظيفي والتقني الكامل لنظام GPS للمبيعات — الأدوار والصلاحيات، المسارات، الكيانات، دورات الحياة، الحسابات، والأوفلاين."
    >
      {/* Top summary & controls toolbar */}
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-sm print:hidden">
        <div className="flex flex-wrap items-center gap-xs text-xs text-on-surface-variant">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-sm py-1 font-semibold text-primary">
            <Icon name="menu_book" size={15} />
            <span>{manual.sections.length} أقسام رئيسية</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-sm py-1 font-medium text-on-surface">
            <Icon name="list" size={15} />
            <span>{totalSubsections} محوراً فرعياً</span>
          </span>
          {trimmedSearch && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-sm py-1 font-semibold text-on-primary">
              <span>
                {totalMatches} نتيجة في {matchingSections.length} قسم
              </span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-xs">
          <button
            type="button"
            onClick={() => setMobileTocOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low px-sm py-1.5 text-xs font-medium text-on-surface hover:border-primary lg:hidden"
          >
            <Icon name="toc" size={16} />
            <span>{mobileTocOpen ? 'إخفاء الفهرس' : 'فهرس الأقسام'}</span>
          </button>

          <div className="inline-flex overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`rounded-md px-sm py-1 font-medium transition ${
                viewMode === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              عرض الكل
            </button>
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`rounded-md px-sm py-1 font-medium transition ${
                viewMode === 'single'
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              قسم واحد
            </button>
          </div>

          <button
            type="button"
            onClick={() => typeof window !== 'undefined' && window.print()}
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-low px-sm py-1.5 text-xs font-medium text-on-surface hover:border-primary hover:text-primary"
          >
            <Icon name="print" size={16} />
            <span>طباعة / PDF</span>
          </button>
        </div>
      </div>

      <div className="grid gap-md lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Sticky Hierarchical Sidebar TOC */}
        <nav
          aria-label="فهرس الدليل"
          className={`${
            mobileTocOpen ? 'block' : 'hidden'
          } h-fit rounded-xl border border-outline-variant bg-surface-container-lowest p-sm lg:sticky lg:top-4 lg:block print:hidden`}
        >
          <div className="mb-xs flex items-center justify-between px-xs">
            <p className="text-xs font-bold text-on-surface-variant">أقسام المرجع</p>
            <button
              type="button"
              onClick={() => {
                const allOpen = manual.sections.every((s) => expandedTocIds[s.id])
                setExpandedTocIds(
                  Object.fromEntries(manual.sections.map((s) => [s.id, !allOpen])),
                )
              }}
              className="text-[11px] text-primary hover:underline"
            >
              {manual.sections.every((s) => expandedTocIds[s.id]) ? 'طي الكل' : 'توسيع الكل'}
            </button>
          </div>

          <div className="max-h-[55vh] space-y-1 overflow-y-auto lg:max-h-[calc(100vh-10rem)]">
            {matchingSections.map((section) => {
              const isActive = activeSectionId === section.id
              const isExpanded = Boolean(expandedTocIds[section.id]) || Boolean(trimmedSearch)
              const matchCount = matchCountsById[section.id]

              return (
                <div key={section.id} className="space-y-0.5">
                  <div
                    className={`flex items-center gap-1 rounded-lg px-xs py-1 transition ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    {section.subsections.length > 0 && (
                      <button
                        type="button"
                        aria-label="توسيع القسم"
                        onClick={() => toggleTocExpand(section.id)}
                        className="rounded p-0.5 text-on-surface-variant hover:text-primary"
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
                      <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {matchCount}
                      </span>
                    ) : null}
                  </div>

                  {isExpanded && section.subsections.length > 0 && (
                    <div className="me-3 space-y-0.5 border-e border-outline-variant/60 pe-2">
                      {section.subsections.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleSelectSection(section.id, sub.id)}
                          className="block w-full rounded-md px-xs py-1 text-right text-[11px] leading-4 text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
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
              <p className="px-sm py-xs text-xs text-on-surface-variant">لا توجد أقسام مطابقة.</p>
            )}
          </div>
        </nav>

        {/* Main Specification Content */}
        <div className="min-w-0 space-y-md">
          <div className="relative print:hidden">
            <Icon
              name="search"
              size={20}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث في الدليل (مثال: صلاحية، قسط، مخزون، أوفلاين، استرداد، ZKTeco)..."
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-sm pe-10 ps-10 text-sm text-on-surface outline-none transition focus:border-primary"
            />
            {search && (
              <button
                type="button"
                aria-label="مسح البحث"
                onClick={() => setSearch('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              >
                <Icon name="close" size={18} />
              </button>
            )}
          </div>

          {showPreamble && manual.preamble && (
            <article className="space-y-sm rounded-xl border border-primary/20 bg-surface-container-lowest p-md shadow-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {manual.preamble}
              </ReactMarkdown>
            </article>
          )}

          {visibleSections.map((section) => (
            <article
              key={section.id}
              className="space-y-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-xs"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {section.markdown}
              </ReactMarkdown>
            </article>
          ))}

          {viewMode === 'single' && !trimmedSearch && visibleSections.length > 0 && (
            <div className="flex items-center justify-between gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-sm print:hidden">
              <button
                type="button"
                disabled={activeIndex <= 0}
                onClick={() => {
                  const prev = manual.sections[activeIndex - 1]
                  if (prev) handleSelectSection(prev.id)
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-sm py-1.5 text-xs font-medium text-on-surface hover:border-primary disabled:opacity-40"
              >
                <Icon name="arrow_forward" size={16} />
                <span>القسم السابق</span>
              </button>
              <span className="text-xs text-on-surface-variant">
                {activeIndex + 1} / {manual.sections.length}
              </span>
              <button
                type="button"
                disabled={activeIndex >= manual.sections.length - 1}
                onClick={() => {
                  const next = manual.sections[activeIndex + 1]
                  if (next) handleSelectSection(next.id)
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-sm py-1.5 text-xs font-medium text-on-surface hover:border-primary disabled:opacity-40"
              >
                <span>القسم التالي</span>
                <Icon name="arrow_back" size={16} />
              </button>
            </div>
          )}

          {visibleSections.length === 0 && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-center">
              <p className="text-sm font-medium text-on-surface">لا توجد نتائج مطابقة لهذا البحث.</p>
              <p className="mt-xs text-xs text-on-surface-variant">
                جرّب كلمة مفتاحية أخرى مثل: الصلاحيات، المسارات، الأقساط، المخزون، أو المزامنة.
              </p>
            </div>
          )}
        </div>
      </div>
    </SalesPageShell>
  )
}
