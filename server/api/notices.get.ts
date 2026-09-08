import type { SiteNoticeJson } from '../../shared/types'

const ORDER = { notice: 0, announcement: 1, warning: 2, error: 3 }

export default defineEventHandler(async (): Promise<SiteNoticeJson[]> => {
  const rows = await useDb().query.siteNotices.findMany({ where: { visibleToUsers: true } })
  return rows
    .sort((a, b) => ORDER[a.type] - ORDER[b.type])
    .map(n => ({ id: n.id, type: n.type, header: n.header, body: n.body }))
})
