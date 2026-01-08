import { getProjectList } from '../utils/session-indexer'

export default defineEventHandler(async () => {
  return await getProjectList()
})
