import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

interface FaqItem {
  id: number
  question_ar: string
  answer_ar: string
  keywords?: string | null
  category?: { name_ar?: string } | null
}

interface FaqCategoryGroup {
  name: string
  items: FaqItem[]
}

function groupByCategory(items: FaqItem[]): FaqCategoryGroup[] {
  const groups = new Map<string, FaqCategoryGroup>()

  for (const item of items) {
    const name = item.category?.name_ar?.trim() || 'أسئلة عامة'
    const existing = groups.get(name)
    if (existing) {
      existing.items.push(item)
      continue
    }
    groups.set(name, { name, items: [item] })
  }

  return Array.from(groups.values())
}

function matchesSearch(item: FaqItem, query: string): boolean {
  const haystack = [item.question_ar, item.answer_ar, item.keywords ?? '']
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

interface FaqAccordionItemProps {
  item: FaqItem
  isOpen: boolean
  onToggle: () => void
}

function FaqAccordionItem({ item, isOpen, onToggle }: FaqAccordionItemProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-start gap-sm px-md py-sm text-right transition-colors hover:bg-surface-container-low"
      >
        <span className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-on-surface">
          {item.question_ar}
        </span>
        <Icon
          name={isOpen ? 'expand_less' : 'expand_more'}
          size={22}
          className="no-flip shrink-0 text-on-surface-variant"
        />
      </button>
      {isOpen && (
        <div className="border-t border-outline-variant px-md py-sm text-sm leading-relaxed text-on-surface-variant">
          {item.answer_ar}
        </div>
      )}
    </div>
  )
}

export function FaqPage() {
  const [openId, setOpenId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim().toLowerCase(), 200)

  const faqQuery = useQuery({
    queryKey: ['faq'],
    queryFn: async () => {
      const { data } = await api.get<{ data: FaqItem[] }>('/faq')
      return data.data ?? []
    },
  })

  const filteredItems = useMemo(() => {
    const items = faqQuery.data ?? []
    if (!debouncedSearch) return items
    return items.filter((item) => matchesSearch(item, debouncedSearch))
  }, [faqQuery.data, debouncedSearch])

  const groupedItems = useMemo(() => groupByCategory(filteredItems), [filteredItems])
  const totalCount = faqQuery.data?.length ?? 0
  const filteredCount = filteredItems.length

  return (
    <SalesPageShell title="الأسئلة الشائعة" subtitle="إجابات سريعة عن استخدام النظام">
      <AsyncState isLoading={faqQuery.isLoading} isError={faqQuery.isError} error={faqQuery.error}>
        <div className="mx-auto max-w-3xl space-y-md">
          <div className="flex items-start gap-sm rounded-xl border border-primary/20 bg-primary/5 p-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Icon name="support_agent" size={22} className="no-flip text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface">لم تجد إجابتك؟</p>
              <p className="mt-xs text-sm leading-relaxed text-on-surface-variant">
                استخدم مساعد الشات في أسفل يسار الشاشة، أو ابحث أدناه بين الأسئلة الشائعة.
              </p>
            </div>
          </div>

          <div className="relative">
            <Icon
              name="search"
              size={20}
              className="no-flip pointer-events-none absolute top-1/2 right-sm -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث في الأسئلة..."
              className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pr-10 pl-sm text-sm text-on-surface outline-none transition focus:border-primary"
            />
          </div>

          {totalCount > 0 && (
            <p className="text-xs text-on-surface-variant">
              {debouncedSearch
                ? `عرض ${filteredCount} من ${totalCount} سؤال`
                : `${totalCount} سؤالاً شائعاً`}
            </p>
          )}

          {groupedItems.length === 0 ? (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-lg text-center">
              <Icon name="search_off" size={32} className="no-flip mx-auto text-on-surface-variant" />
              <p className="mt-sm text-sm font-semibold text-on-surface">لا توجد نتائج</p>
              <p className="mt-xs text-sm text-on-surface-variant">
                {debouncedSearch
                  ? 'جرّب كلمات مختلفة أو امسح البحث.'
                  : 'لا توجد أسئلة منشورة بعد.'}
              </p>
              {debouncedSearch && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-sm text-sm font-medium text-primary hover:underline"
                >
                  مسح البحث
                </button>
              )}
            </div>
          ) : (
            groupedItems.map((group) => (
              <section key={group.name}>
                {groupedItems.length > 1 && (
                  <h2 className="mb-sm flex items-center gap-xs text-sm font-bold text-primary">
                    <Icon name="folder_open" size={18} className="no-flip" />
                    {group.name}
                    <span className="text-xs font-medium text-on-surface-variant">
                      ({group.items.length})
                    </span>
                  </h2>
                )}
                <div className="flex flex-col gap-xs">
                  {group.items.map((item) => (
                    <FaqAccordionItem
                      key={item.id}
                      item={item}
                      isOpen={openId === item.id}
                      onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </AsyncState>
    </SalesPageShell>
  )
}
