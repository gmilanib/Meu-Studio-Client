import { Navigate, useLocation } from 'react-router'
import { useAuth } from './Auth.jsx'

export default function ProtectedRoute({ children }) {
  const { authenticated } = useAuth()
  const location = useLocation()

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
