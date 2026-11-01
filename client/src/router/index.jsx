import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Skeleton from '../components/ui/Skeleton/Skeleton';
import ProtectedRoute from '../components/auth/ProtectedRoute';

/* Lazy-loaded pages */
const Landing = lazy(() => import('../pages/Landing'));
const Login = lazy(() => import('../pages/Login'));
const Onboarding = lazy(() => import('../pages/Onboarding'));
const DashboardRedirect = lazy(() => import('../pages/DashboardRedirect'));
const SharedPlan = lazy(() => import('../pages/SharedPlan'));
const GuestUpload = lazy(() => import('../pages/GuestUpload'));

/* Dashboard shell */
const AppShell = lazy(() => import('../components/layout/AppShell/AppShell'));

/* Dashboard child pages */
const Overview = lazy(() => import('../pages/dashboard/Overview'));
const Budget = lazy(() => import('../pages/dashboard/Budget'));
const Timeline = lazy(() => import('../pages/dashboard/Timeline'));
const Vendors = lazy(() => import('../pages/dashboard/Vendors'));
const Ideas = lazy(() => import('../pages/dashboard/Ideas'));
const Memories = lazy(() => import('../pages/dashboard/Memories'));

/** Fallback shown while a lazy route loads. */
function RouteFallback() {
  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '800px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
      aria-busy="true"
      aria-label="Loading page content"
    >
      <Skeleton variant="title" />
      <Skeleton variant="card" />
      <Skeleton variant="text" />
      <Skeleton variant="text" />
    </div>
  );
}

/** Wrap an element in Suspense with the route fallback. */
function withSuspense(Component) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  );
}

const router = createBrowserRouter([
  { path: '/', element: withSuspense(Landing) },
  { path: '/login', element: withSuspense(Login) },
  {
    path: '/onboarding',
    element: <ProtectedRoute>{withSuspense(Onboarding)}</ProtectedRoute>,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute>{withSuspense(DashboardRedirect)}</ProtectedRoute>,
  },
  {
    path: '/dashboard/:eventId',
    element: <ProtectedRoute>{withSuspense(AppShell)}</ProtectedRoute>,
    children: [
      { index: true, element: withSuspense(Overview) },
      { path: 'overview', element: withSuspense(Overview) },
      { path: 'budget', element: withSuspense(Budget) },
      { path: 'timeline', element: withSuspense(Timeline) },
      { path: 'vendors', element: withSuspense(Vendors) },
      { path: 'ideas', element: withSuspense(Ideas) },
      { path: 'memories', element: withSuspense(Memories) },
    ],
  },
  { path: '/plan/:shareToken', element: withSuspense(SharedPlan) },
  { path: '/share/:shareToken', element: withSuspense(SharedPlan) },
  { path: '/upload/:memoryToken', element: withSuspense(GuestUpload) },
]);

export default router;
