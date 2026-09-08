export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number.parseInt(String(query.page ?? '1'), 10) || 1
  return listHistory(page, query.hideSolo === 'true')
})
