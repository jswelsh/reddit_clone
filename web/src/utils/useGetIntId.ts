import { useRouter } from "next/router"

///could refactor checkout 10:58:00
export const useGetIntId = () => {
  const router = useRouter()
  const intId = typeof router.query.id === 'string' ? parseInt(router.query.id) : -1
  return intId
}