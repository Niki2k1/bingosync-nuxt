export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return useDb().query.filteredPatterns.findMany({ orderBy: { id: 'asc' } })
})
