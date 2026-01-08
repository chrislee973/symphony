import { getSessionList } from '../../utils/session-indexer'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const limit = query.limit ? Number(query.limit) : 20
  const cursor = query.cursor as string | undefined
  const projectFilter = query.project as string | undefined

  const result = await getSessionList({
    limit: Math.min(limit, 100), // Cap at 100
    cursor,
    projectFilter,
  })

  return result
})
