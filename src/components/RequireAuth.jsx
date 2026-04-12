import { Navigate, Outlet, useLocation } from "react-router-dom"
import { getToken } from "../services/api"

/** Wraps private routes: redirects to login when there is no Bearer token. */
export function RequireAuth() {
  const location = useLocation()
  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

/** Wraps login/signup: redirects to home when already signed in. */
export function GuestOnly() {
  if (getToken()) {
    return <Navigate to="/home" replace />
  }
  return <Outlet />
}

/** `/` → `/home` if authenticated, otherwise `/login`. */
export function IndexRedirect() {
  return getToken() ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />
}
