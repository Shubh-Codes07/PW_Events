import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../ui/Skeleton/Skeleton';

/**
 * Route guard that requires an authenticated user.
 * Displays loading skeletons while session initializes, and redirects to /login
 * preserving the return location in navigation state.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          padding: 'var(--space-8)',
          maxWidth: '600px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
        aria-busy="true"
        aria-label="Checking authentication status"
      >
        <Skeleton variant="title" />
        <Skeleton variant="card" />
        <Skeleton variant="text" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
