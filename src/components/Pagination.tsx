interface PaginationProps {
  currentPage: number
  lastPage: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({
  currentPage,
  lastPage,
  total,
  onPageChange,
}: PaginationProps) {
  if (total === 0) return null

  return (
    <div className="mt-md flex flex-wrap items-center justify-between gap-sm text-sm text-on-surface-variant">
      <span>
        إجمالي {total} — صفحة {currentPage} من {lastPage}
      </span>
      <div className="flex gap-xs">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded border border-outline-variant px-sm py-1 disabled:opacity-40"
        >
          السابق
        </button>
        <button
          type="button"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded border border-outline-variant px-sm py-1 disabled:opacity-40"
        >
          التالي
        </button>
      </div>
    </div>
  )
}
