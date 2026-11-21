import { isValidElement, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Icon } from '../components/Icon'
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

interface SectionMeta {
  icon: string
  accent: 'blue' | 'teal'
  shortTitle: string
  description: string
  category: string
}

const SECTION_META: SectionMeta[] = [
  {
    icon: 'public',
    accent: 'blue',
    shortTitle: 'نظرة عامة على النظام والبيئة',
    description: 'نطاق النظام، أوضاع التشغيل السحابي والأوفلاين، اتجاه RTL، وسلوك الموبايل والقوائم.',
    category: 'التأسيس والبيئة',
  },
  {
    icon: 'admin_panel_settings',
    accent: 'teal',
    shortTitle: 'الأدوار والصلاحيات (RBAC)',
    description: 'الأدوار الـ 11، القائمة السوداء للمديرين، كتالوج الصلاحيات، ونطاق عزل البيانات.',
    category: 'الأمان والصلاحيات',
  },
  {
    icon: 'account_tree',
    accent: 'blue',
    shortTitle: 'خريطة الشاشات والمسارات',
    description: 'جميع مسارات الواجهة الظاهرة والمخفية، الطباعة، بوابة العميل، وخريطة الـ API.',
    category: 'التنقل والمسارات',
  },
  {
    icon: 'dataset',
    accent: 'teal',
    shortTitle: 'الكيانات والحقول والتحقق',
    description: 'الحقول الإلزامية والاختيارية، قواعد التحقق، ورسائل المنع الدقيقة لكل موديول.',
    category: 'البيانات والنماذج',
  },
  {
    icon: 'sync_alt',
    accent: 'blue',
    shortTitle: 'دورات الحياة وحالات التحوّل',
    description: 'جميع الـ Enums والانتقالات المسموحة والممنوعة للعقود والأقساط والمخزون والدعم.',
    category: 'إدارة الحالات',
  },
  {
    icon: 'checklist',
    accent: 'teal',
    shortTitle: 'العمليات والـ Workflows',
    description: 'خطوات التنفيذ التفصيلية والتأثيرات الجانبية على المخزون والمحاسبة والأقساط.',
    category: 'سير العمل',
  },
  {
    icon: 'calculate',
    accent: 'blue',
    shortTitle: 'الحسابات والمنطق المالي',
    description: 'معادلات التسعير والعروض، أولويات التحصيل والغرامات، الرواتب، والمحاسبة.',
    category: 'القواعد المالية',
  },
  {
    icon: 'shield',
    accent: 'teal',
    shortTitle: 'الحالات الحدية والأوفلاين',
    description: 'أخطاء الشبكة، مزامنة الفروع، سلة المهملات، سجل التدقيق، وأقفال التزامن.',
    category: 'الاعتمادية والأمان',
  },
]

function getSectionMeta(index: number, fallbackTitle: string): SectionMeta {
  return (
    SECTION_META[index] ?? {
      icon: 'article',
      accent: 'blue',
      shortTitle: fallbackTitle,
      description: 'توثيق تفصيلي للمحاور والقواعد والقيود المرتبطة بهذا القسم.',
      category: 'توثيق النظام',
    }
  )
}

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
  isDark: boolean,
  copiedId: string | null,
  onCopyAnchor: (id: string) => void,
): Components {
  const textPrimary = isDark ? 'text-slate-100' : 'text-[#0F172A]'
  const textBody = isDark ? 'text-slate-300' : 'text-slate-700'
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500'
  const borderColor = isDark ? 'border-slate-800' : 'border-[#E2E8F0]'

  return {
    h1: ({ children }) => (
      <h1 className={`mb-4 text-2xl font-bold tracking-tight ${textPrimary}`}>{children}</h1>
    ),
    h2: ({ children }) => {
      const id = manualHeadingId(nodeText(children))
      const isCopied = copiedId === id
      return (
        <div
          className={`group mb-6 flex items-center justify-between gap-4 border-b pb-4 ${borderColor}`}
        >
          <h2 id={id} className={`scroll-mt-28 text-2xl font-bold tracking-tight ${textPrimary}`}>
            {children}
          </h2>
          <button
            type="button"
            onClick={() => onCopyAnchor(id)}
            title="نسخ رابط القسم"
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition print:hidden ${
              isDark
                ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-[#2563EB] hover:text-blue-400'
                : 'border-[#E2E8F0] bg-[#F8FAFC] text-slate-600 hover:border-[#2563EB] hover:text-[#2563EB]'
            }`}
          >
            <Icon name={isCopied ? 'check' : 'link'} size={14} />
            <span>{isCopied ? 'تم النسخ' : 'نسخ الرابط'}</span>
          </button>
        </div>
      )
    },
    h3: ({ children }) => {
      const id = manualHeadingId(nodeText(children))
      return (
        <h3
          id={id}
          className={`mt-8 mb-3 scroll-mt-28 border-t pt-6 text-lg font-bold first:mt-2 first:border-t-0 first:pt-0 ${borderColor} ${
            isDark ? 'text-blue-400' : 'text-[#0F172A]'
          }`}
        >
          {children}
        </h3>
      )
    },
    h4: ({ children }) => (
      <h4
        className={`mt-5 mb-2.5 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${
          isDark
            ? 'border-teal-800/60 bg-teal-950/50 text-teal-300'
            : 'border-teal-200 bg-teal-50 text-[#0D9488]'
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#0D9488]" />
        <span>{children}</span>
      </h4>
    ),
    p: ({ children }) => (
      <p className={`my-3 text-[15px] leading-8 ${textBody}`}>{children}</p>
    ),
    ul: ({ children }) => (
      <ul className={`my-3.5 list-outside list-disc space-y-2 pr-6 text-[15px] leading-8 ${textBody}`}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol
        className={`my-3.5 list-outside list-decimal space-y-2.5 pr-6 text-[15px] leading-8 ${textBody}`}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="pl-1 marker:font-semibold marker:text-[#2563EB]">{children}</li>
    ),
    strong: ({ children }) => <strong className={`font-bold ${textPrimary}`}>{children}</strong>,
    blockquote: ({ children }) => (
      <blockquote
        className={`my-4 space-y-1.5 rounded-xl border border-r-4 px-4 py-3.5 text-sm leading-7 ${
          isDark
            ? 'border-blue-900/70 border-r-[#2563EB] bg-blue-950/35 text-slate-200'
            : 'border-blue-200/80 border-r-[#2563EB] bg-blue-50/70 text-slate-800'
        }`}
      >
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => {
      if (href?.startsWith('#')) {
        const id = decodeURIComponent(href.slice(1))
        return (
          <button
            type="button"
            className="font-medium text-[#2563EB] underline-offset-4 hover:underline"
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
            className="font-medium text-[#2563EB] underline-offset-4 hover:underline"
          >
            {children}
          </a>
        )
      }
      return <span>{children}</span>
    },
    table: ({ children }) => (
      <div className={`my-5 overflow-x-auto rounded-xl border ${borderColor}`}>
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className={isDark ? 'bg-slate-800/80' : 'bg-[#F8FAFC]'}>{children}</thead>
    ),
    tr: ({ children }) => (
      <tr
        className={`border-b transition-colors last:border-b-0 ${borderColor} ${
          isDark ? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/40'
        }`}
      >
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th
        className={`border-l px-4 py-3 text-right text-xs font-bold whitespace-nowrap last:border-l-0 ${borderColor} ${textPrimary}`}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        className={`border-l px-4 py-3 align-top text-xs leading-6 last:border-l-0 ${borderColor} ${textBody}`}
      >
        {children}
      </td>
    ),
    pre: ({ children }) => (
      <pre
        dir="ltr"
        className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-[#0F172A] p-4 text-left text-xs leading-6 text-slate-100"
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
          className={`mx-0.5 inline rounded-md border px-1.5 py-0.5 font-mono text-[12.5px] font-medium [unicode-bidi:isolate] ${
            isDark
              ? 'border-slate-700 bg-slate-800 text-teal-300'
              : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]'
          }`}
        >
          {children}
        </code>
      )
    },
    hr: () => <hr className={`my-7 ${borderColor}`} />,
    em: ({ children }) => <em className={textMuted}>{children}</em>,
  }
}

export interface UserManualPageProps {
  initialSectionId?: string | null
}

export function UserManualPage({ initialSectionId = null }: UserManualPageProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(initialSectionId)
  const [activeSubId, setActiveSubId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const trimmedSearch = search.trim()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        requestAnimationFrame(() => searchInputRef.current?.focus())
      } else if (event.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [searchOpen])

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

  const totalSubsections = useMemo(
    () => manual.sections.reduce((acc, s) => acc + s.subsections.length, 0),
    [],
  )

  const selectedIndex = useMemo(
    () => (selectedSectionId ? manual.sections.findIndex((s) => s.id === selectedSectionId) : -1),
    [selectedSectionId],
  )

  const currentSection = selectedIndex >= 0 ? manual.sections[selectedIndex] : null
  const currentMeta = currentSection
    ? getSectionMeta(selectedIndex, currentSection.title)
    : null

  const openSection = (sectionId: string, subId?: string) => {
    setSelectedSectionId(sectionId)
    setActiveSubId(subId ?? null)
    setMobileNavOpen(false)
    setSearchOpen(false)
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        if (subId) {
          scrollToHeading(subId)
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      })
    }
  }

  const handleCopyAnchor = (id: string) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(id)}`
      void navigator.clipboard.writeText(url)
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000)
  }

  const markdownComponents = useMemo(
    () => buildMarkdownComponents(isDark, copiedId, handleCopyAnchor),
    [isDark, copiedId],
  )

  const prevSection = selectedIndex > 0 ? manual.sections[selectedIndex - 1] : null
  const nextSection =
    selectedIndex >= 0 && selectedIndex < manual.sections.length - 1
      ? manual.sections[selectedIndex + 1]
      : null

  return (
    <div
      className={`min-h-[calc(100vh-4.5rem)] rounded-2xl border shadow-sm transition-colors ${
        isDark
          ? 'border-slate-800 bg-[#0F172A] text-slate-100'
          : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      {/* Top Portal Header (#0F172A Deep Slate) */}
      <header className="rounded-t-2xl bg-[#0F172A] px-5 py-3.5 text-white print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedSectionId(null)
              setActiveSubId(null)
            }}
            className="flex items-center gap-3 text-right transition hover:opacity-90"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-sm">
              <Icon name="menu_book" size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-wide">GPS ERP DOCS</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-teal-300">
                  الإصدار 2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">مركز المعرفة والمرجع التفصيلي الشامل</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {currentSection && (
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(true)
                  requestAnimationFrame(() => searchInputRef.current?.focus())
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                <Icon name="search" size={16} />
                <span className="hidden sm:inline">بحث سريع...</span>
                <kbd
                  dir="ltr"
                  className="hidden rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 sm:inline"
                >
                  ⌘ K
                </kbd>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
              aria-label={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={18} />
            </button>

            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 text-xs font-medium text-slate-200 transition hover:border-[#2563EB] hover:bg-[#2563EB]/20 hover:text-white"
            >
              <Icon name="print" size={16} />
              <span className="hidden sm:inline">طباعة / PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Breadcrumb & Utility Bar */}
      <div
        className={`border-b px-5 py-2.5 text-xs print:hidden ${
          isDark
            ? 'border-slate-800 bg-slate-900/70 text-slate-400'
            : 'border-[#E2E8F0] bg-white text-slate-500'
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedSectionId(null)}
              className={`font-medium transition hover:text-[#2563EB] ${
                !currentSection ? (isDark ? 'text-slate-100' : 'text-[#0F172A]') : ''
              }`}
            >
              التوثيق
            </button>
            <span>/</span>
            {currentSection && currentMeta ? (
              <>
                <span className="hidden sm:inline">{currentMeta.category}</span>
                <span className="hidden sm:inline">/</span>
                <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-[#0F172A]'}`}>
                  {currentMeta.shortTitle}
                </span>
              </>
            ) : (
              <span>المرجع الشامل للنظام</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 sm:inline-flex">
              <Icon name="layers" size={14} />
              <span>{manual.sections.length} أقسام</span>
              <span>•</span>
              <span>{totalSubsections} محوراً</span>
            </span>
            {currentSection && (
              <button
                type="button"
                onClick={() => setMobileNavOpen((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-medium lg:hidden ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-slate-200'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-slate-700'
                }`}
              >
                <Icon name="toc" size={15} />
                <span>الأقسام</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Body: Homepage OR 3-Column Documentation Reader */}
      {!currentSection ? (
        /* ==================== PORTAL HOMEPAGE ==================== */
        <div className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
          {/* Command-style Search Bar */}
          <div className="relative mb-8">
            <Icon
              name="search"
              size={20}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في التوثيق، الصلاحيات، المسارات، الحسابات، الأوفلاين، أو الـ API..."
              className={`w-full rounded-xl border py-3.5 pr-12 pl-20 text-sm shadow-2xs outline-none transition ${
                isDark
                  ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25'
                  : 'border-[#E2E8F0] bg-white text-[#0F172A] placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15'
              }`}
            />
            <div className="absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              {search ? (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  onClick={() => setSearch('')}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-600"
                >
                  <Icon name="close" size={16} />
                </button>
              ) : (
                <kbd
                  dir="ltr"
                  className={`rounded-md border px-2 py-0.5 font-mono text-[11px] ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-400'
                      : 'border-[#E2E8F0] bg-[#F8FAFC] text-slate-500'
                  }`}
                >
                  ⌘ K
                </kbd>
              )}
            </div>
          </div>

          {/* Hero Section */}
          <div className="mb-8 space-y-2">
            <h1
              className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${
                isDark ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              كل ما تحتاجه لإتقان نظام GPS للمبيعات.
            </h1>
            <p className={`max-w-2xl text-sm leading-7 sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              تصفّح موديولات النظام، الصلاحيات ونطاق البيانات، دورات الحياة، المعادلات المالية،
              ومعمارية المزامنة الأوفلاين في مرجع واحد مستخرج مباشرة من الكود الفعلي.
            </p>
          </div>

          {/* Search Results Info */}
          {trimmedSearch && (
            <div className="mb-5 flex items-center justify-between text-xs">
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                تم العثور على <strong className="text-[#2563EB]">{matchingSections.length}</strong>{' '}
                أقسام مطابقة لـ «{trimmedSearch}»
              </span>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="font-medium text-[#2563EB] hover:underline"
              >
                عرض جميع الأقسام
              </button>
            </div>
          )}

          {/* Module Cards Grid (2 columns like Stripe/Odoo concept) */}
          <div className="grid gap-4 sm:grid-cols-2">
            {matchingSections.map((section) => {
              const idx = manual.sections.findIndex((s) => s.id === section.id)
              const meta = getSectionMeta(idx, section.title)
              const matches = matchCountsById[section.id]
              const iconColor =
                meta.accent === 'teal'
                  ? isDark
                    ? 'bg-teal-950/70 text-teal-400 border-teal-800/50'
                    : 'bg-teal-50 text-[#0D9488] border-teal-100'
                  : isDark
                    ? 'bg-blue-950/70 text-blue-400 border-blue-800/50'
                    : 'bg-blue-50 text-[#2563EB] border-blue-100'

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => openSection(section.id)}
                  className={`group flex flex-col justify-between rounded-2xl border p-5 text-right transition-all ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/80 hover:border-[#2563EB] hover:bg-slate-900'
                      : 'border-[#E2E8F0] bg-white hover:border-[#2563EB]/60 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="mb-3.5 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 ${iconColor}`}
                      >
                        <Icon name={meta.icon} size={20} />
                      </span>
                      <div className="flex items-center gap-1.5">
                        {matches ? (
                          <span className="rounded-full bg-[#2563EB] px-2.5 py-0.5 text-[11px] font-bold text-white">
                            {matches} نتيجة
                          </span>
                        ) : null}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            isDark
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-[#F8FAFC] text-slate-500'
                          }`}
                        >
                          {section.subsections.length} محاور
                        </span>
                      </div>
                    </div>

                    <h2
                      className={`mb-1.5 text-base font-bold transition-colors group-hover:text-[#2563EB] ${
                        isDark ? 'text-slate-100' : 'text-[#0F172A]'
                      }`}
                    >
                      {idx + 1}. {meta.shortTitle}
                    </h2>
                    <p
                      className={`text-xs leading-6 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {meta.description}
                    </p>
                  </div>

                  {/* Preview of first 3 subsections */}
                  {section.subsections.length > 0 && (
                    <div
                      className={`mt-4 flex flex-wrap gap-1.5 border-t pt-3 ${
                        isDark ? 'border-slate-800' : 'border-slate-100'
                      }`}
                    >
                      {section.subsections.slice(0, 3).map((sub) => (
                        <span
                          key={sub.id}
                          className={`max-w-[13rem] truncate rounded-md px-2 py-0.5 text-[11px] ${
                            isDark
                              ? 'bg-slate-800/80 text-slate-300'
                              : 'bg-[#F8FAFC] text-slate-600'
                          }`}
                        >
                          {sub.title.replace(/^\d+\.\d+\s*/, '')}
                        </span>
                      ))}
                      {section.subsections.length > 3 && (
                        <span className="px-1 py-0.5 text-[11px] font-medium text-[#2563EB]">
                          +{section.subsections.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {matchingSections.length === 0 && (
            <div
              className={`rounded-2xl border p-10 text-center ${
                isDark ? 'border-slate-800 bg-slate-900' : 'border-[#E2E8F0] bg-white'
              }`}
            >
              <p className="text-sm font-semibold">لا توجد نتائج مطابقة لبحثك.</p>
              <p className="mt-1 text-xs text-slate-500">
                جرّب البحث عن: الصلاحيات، المخزون، الأقساط، الرواتب، المحاسبة، أو الأوفلاين.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ==================== 3-COLUMN DOCUMENTATION READER ==================== */
        <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[15.5rem_minmax(0,1fr)_14.5rem]">
          {/* Column 1 (Right in RTL): Modules Navigation */}
          <aside
            aria-label="التنقل بين الأقسام"
            className={`${
              mobileNavOpen ? 'block' : 'hidden'
            } rounded-xl border p-3.5 lg:sticky lg:top-20 lg:block print:hidden ${
              isDark
                ? 'border-slate-800 bg-slate-900/70'
                : 'border-[#E2E8F0] bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedSectionId(null)
                setMobileNavOpen(false)
              }}
              className={`mb-3 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                isDark
                  ? 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-[#2563EB] hover:text-blue-400'
                  : 'border-[#E2E8F0] bg-[#F8FAFC] text-slate-700 hover:border-[#2563EB] hover:text-[#2563EB]'
              }`}
            >
              <Icon name="home" size={16} />
              <span>الرئيسية (كل الأقسام)</span>
            </button>

            <p
              className={`mb-2 px-2 text-[11px] font-bold tracking-wider uppercase ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              أقسام المرجع
            </p>

            <nav className="max-h-[calc(100vh-14rem)] space-y-1 overflow-y-auto">
              {manual.sections.map((section, idx) => {
                const meta = getSectionMeta(idx, section.title)
                const isActive = section.id === currentSection.id
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => openSection(section.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-right text-xs transition ${
                      isActive
                        ? isDark
                          ? 'bg-[#2563EB]/20 font-bold text-blue-400'
                          : 'bg-blue-50 font-bold text-[#2563EB]'
                        : isDark
                          ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          : 'text-slate-600 hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                    }`}
                  >
                    <Icon name={meta.icon} size={16} className="shrink-0" />
                    <span className="leading-5">
                      {idx + 1}. {meta.shortTitle}
                    </span>
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Column 2 (Center): Main Content */}
          <main className="min-w-0">
            <article
              className={`rounded-2xl border p-6 sm:p-8 ${
                isDark
                  ? 'border-slate-800 bg-slate-900/60'
                  : 'border-[#E2E8F0] bg-white shadow-2xs'
              }`}
            >
              {/* Module Category Pill */}
              {currentMeta && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      isDark
                        ? 'bg-blue-950/70 text-blue-300'
                        : 'bg-blue-50 text-[#2563EB]'
                    }`}
                  >
                    <Icon name={currentMeta.icon} size={14} />
                    <span>{currentMeta.category}</span>
                  </span>
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {currentSection.subsections.length} محاور فرعية
                  </span>
                </div>
              )}

              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {currentSection.markdown}
              </ReactMarkdown>
            </article>

            {/* Previous / Next Module Navigation Cards */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 print:hidden">
              {prevSection ? (
                <button
                  type="button"
                  onClick={() => openSection(prevSection.id)}
                  className={`flex flex-col items-start rounded-xl border p-4 text-right transition ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/70 hover:border-[#2563EB]'
                      : 'border-[#E2E8F0] bg-white hover:border-[#2563EB]'
                  }`}
                >
                  <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <Icon name="arrow_forward" size={14} />
                    <span>القسم السابق</span>
                  </span>
                  <span className="text-sm font-bold text-[#2563EB]">
                    {getSectionMeta(selectedIndex - 1, prevSection.title).shortTitle}
                  </span>
                </button>
              ) : (
                <div />
              )}

              {nextSection && (
                <button
                  type="button"
                  onClick={() => openSection(nextSection.id)}
                  className={`flex flex-col items-end rounded-xl border p-4 text-left transition ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/70 hover:border-[#2563EB]'
                      : 'border-[#E2E8F0] bg-white hover:border-[#2563EB]'
                  }`}
                >
                  <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <span>القسم التالي</span>
                    <Icon name="arrow_back" size={14} />
                  </span>
                  <span className="text-sm font-bold text-[#2563EB]">
                    {getSectionMeta(selectedIndex + 1, nextSection.title).shortTitle}
                  </span>
                </button>
              )}
            </div>
          </main>

          {/* Column 3 (Left in RTL): "On this page" Outline */}
          <aside
            aria-label="في هذه الصفحة"
            className="hidden lg:sticky lg:top-20 lg:block print:hidden"
          >
            <div
              className={`border-r-2 pr-4 ${
                isDark ? 'border-slate-800' : 'border-[#E2E8F0]'
              }`}
            >
              <p
                className={`mb-3 text-xs font-bold ${
                  isDark ? 'text-slate-200' : 'text-[#0F172A]'
                }`}
              >
                في هذه الصفحة
              </p>
              <ul className="max-h-[calc(100vh-12rem)] space-y-2 overflow-y-auto">
                {currentSection.subsections.map((sub) => {
                  const isActive = activeSubId === sub.id
                  return (
                    <li key={sub.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSubId(sub.id)
                          scrollToHeading(sub.id)
                        }}
                        className={`block w-full text-right text-xs leading-5 transition ${
                          isActive
                            ? 'font-bold text-[#2563EB]'
                            : isDark
                              ? 'text-slate-400 hover:text-slate-200'
                              : 'text-slate-500 hover:text-[#0F172A]'
                        }`}
                      >
                        {sub.title}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </aside>
        </div>
      )}

      {/* Command Palette Search Modal (⌘K) when inside a section */}
      {searchOpen && currentSection && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 pt-20 backdrop-blur-xs print:hidden"
          onClick={() => setSearchOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl ${
              isDark
                ? 'border-slate-700 bg-slate-900 text-slate-100'
                : 'border-[#E2E8F0] bg-white text-[#0F172A]'
            }`}
          >
            <div
              className={`relative border-b ${
                isDark ? 'border-slate-800' : 'border-[#E2E8F0]'
              }`}
            >
              <Icon
                name="search"
                size={20}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في جميع أقسام المرجع..."
                className="w-full bg-transparent py-3.5 pr-12 pl-12 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-0.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 space-y-1 overflow-y-auto p-2">
              {matchingSections.map((section) => {
                const idx = manual.sections.findIndex((s) => s.id === section.id)
                const meta = getSectionMeta(idx, section.title)
                const matches = matchCountsById[section.id]
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => openSection(section.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right transition ${
                      isDark ? 'hover:bg-slate-800' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon name={meta.icon} size={18} className="text-[#2563EB]" />
                      <div>
                        <p className="text-xs font-bold">
                          {idx + 1}. {meta.shortTitle}
                        </p>
                        <p className="text-[11px] text-slate-400">{meta.description}</p>
                      </div>
                    </div>
                    {matches ? (
                      <span className="shrink-0 rounded-full bg-[#2563EB]/15 px-2 py-0.5 text-[11px] font-bold text-[#2563EB]">
                        {matches}
                      </span>
                    ) : null}
                  </button>
                )
              })}
              {matchingSections.length === 0 && (
                <p className="py-8 text-center text-xs text-slate-400">لا توجد نتائج مطابقة.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
