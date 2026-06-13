import type { ActivityLogEntry } from '../../../api/types'
import { inferActivityAction, type ActivityAction } from './activityLogLabels'

export interface ActivityLogInsights {
  total: number
  todayCount: number
  weekCount: number
  uniqueUsers: number
  byAction: Record<ActivityAction, number>
  byLogName: Record<string, number>
  topUsers: { name: string; count: number }[]
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function computeActivityLogInsights(
  entries: ActivityLogEntry[],
  total?: number,
): ActivityLogInsights {
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)

  const byAction: Record<ActivityAction, number> = {
    create: 0,
    update: 0,
    delete: 0,
    login: 0,
    other: 0,
  }
  const byLogName: Record<string, number> = {}
  const userCounts = new Map<string, number>()

  let todayCount = 0
  let weekCount = 0

  for (const entry of entries) {
    const created = entry.created_at ? new Date(entry.created_at) : null
    if (created) {
      if (created >= todayStart) todayCount++
      if (created >= weekStart) weekCount++
    }

    const action = inferActivityAction(entry.description, entry.event)
    byAction[action]++

    const logName = entry.log_name ?? 'default'
    byLogName[logName] = (byLogName[logName] ?? 0) + 1

    const userName = entry.causer?.name ?? '—'
    userCounts.set(userName, (userCounts.get(userName) ?? 0) + 1)
  }

  const topUsers = [...userCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    total: total ?? entries.length,
    todayCount,
    weekCount,
    uniqueUsers: userCounts.size,
    byAction,
    byLogName,
    topUsers,
  }
}

export function exportActivityLogCsv(entries: ActivityLogEntry[]): string {
  const header = ['ID', 'Date', 'User', 'Action', 'Description', 'Type', 'Event']
  const rows = entries.map((e) => [
    String(e.id),
    e.created_at ?? '',
    e.causer?.name ?? '',
    inferActivityAction(e.description, e.event),
    e.description,
    e.log_name ?? '',
    e.event ?? '',
  ])

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
