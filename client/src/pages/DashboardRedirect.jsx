import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { Skeleton } from '../components/ui';

/**
 * /dashboard redirector:
 * Fetches user's events, redirecting to their most recent event's overview,
 * or to /onboarding if no events exist yet.
 */
export default function DashboardRedirect() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function checkEvents() {
      try {
        const res = await apiFetch('/events');
        if (!isMounted) return;

        const events = res.data || [];
        if (events.length > 0) {
          navigate(`/dashboard/${events[0].id}`, { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('[DASHBOARD REDIRECT ERROR]:', err);
        setError(err.message || 'Could not verify events');
        navigate('/onboarding', { replace: true });
      }
    }

    checkEvents();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

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
      aria-label="Finding your celebrations"
    >
      <Skeleton variant="title" />
      <Skeleton variant="card" />
      <Skeleton variant="text" />
    </div>
  );
}
