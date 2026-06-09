import { Link, useParams } from 'react-router-dom'
import { BranchPageHeader } from '../../components/enterprise/BranchPageHeader'
import { BranchKpiGrid } from '../../components/enterprise/BranchKpiGrid'
import { BranchInventoryTable } from '../../components/enterprise/BranchInventoryTable'
import { BranchOperationsPanel } from '../../components/enterprise/BranchOperationsPanel'
import { getBranchDetail } from '../../data/branchDetailMock'

export function BranchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const branch = getBranchDetail(id)

  return (
    <main className="flex-1 p-lg pb-32 md:mr-64">
      <nav className="mb-md">
        <ol className="flex gap-xs text-body-sm text-secondary">
          <li>
            <a href="#" className="transition-colors hover:text-primary">
              المؤسسة
            </a>
          </li>
          <li className="no-flip">/</li>
          <li>
            <Link to="/branches" className="transition-colors hover:text-primary">
              الفروع
            </Link>
          </li>
          <li className="no-flip">/</li>
          <li className="font-bold text-on-surface">{branch.name}</li>
        </ol>
      </nav>

      <BranchPageHeader branch={branch} />
      <BranchKpiGrid kpis={branch.kpis} />

      <div className="grid grid-cols-1 gap-xl lg:grid-cols-12">
        <div className="space-y-xl lg:col-span-8">
          <BranchInventoryTable products={branch.products} />
        </div>
        <div className="space-y-xl lg:col-span-4">
          <BranchOperationsPanel branch={branch} />
        </div>
      </div>
    </main>
  )
}
