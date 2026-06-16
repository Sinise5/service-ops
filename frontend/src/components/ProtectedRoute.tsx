import { Show } from "solid-js"
import { Navigate } from "@solidjs/router"
import { useAuth } from "../stores/AuthStore"
import type { ParentProps } from "solid-js"

export function ProtectedRoute(props: ParentProps) {
  const auth = useAuth()
  
  return (
    <Show when={auth?.isAuthenticated()} fallback={<Navigate href="/login" />}>
      {props.children}
    </Show>
  )
}
