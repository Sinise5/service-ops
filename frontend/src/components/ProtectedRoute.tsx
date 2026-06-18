import { useAuth } from "../stores/AuthStore"
import { useNavigate } from "@solidjs/router"
import { onMount, type ParentProps } from "solid-js"

export function ProtectedRoute(props: ParentProps) {
  const auth = useAuth()
  const navigate = useNavigate()

  onMount(() => {
    if (!auth?.isAuthenticated()) {
      navigate("/login", { replace: true })
    }
  })

  return <>{props.children}</>
}
