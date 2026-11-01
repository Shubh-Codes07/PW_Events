import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle/ThemeToggle';
import { Skeleton, Button } from '../components/ui';
import styles from './SharedPlan.module.css';

export default function SharedPlan() {
  const { shareToken } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSharedPlan = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const res = await fetch(`${apiUrl}/shared/${shareToken}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Shared celebration plan not found or expired.');
        }

        if (isMounted) {
          setData(json.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (shareToken) {
      fetchSharedPlan();
    }
    return () => {
      isMounted = false;
    };
  }, [shareToken]);

  if (loading) {
    return (
      <main className={styles.container} aria-busy="true" aria-label="Loading celebration plan">
        <div className={styles.topBar}>
          <div className={styles.brand}>🎊 Utsav</div>
        </div>
        <Skeleton variant="card" height="160px" />
        <div className={styles.sectionGrid}>
          <Skeleton variant="card" height="280px" />
          <Skeleton variant="card" height="280px" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className={styles.container}>
        <div className={styles.topBar}>
          <Link to="/" className={styles.brand}>🎊 Utsav</Link>
          <ThemeToggle />
        </div>
        <div className={styles.errorCard} role="alert">
          <span className={styles.errorIcon} aria-hidden="true">🔒</span>
          <h2>Plan Link Expired or Invalid</h2>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '420px', lineHeight: 1.5 }}>
            {error || 'This shared plan is no longer accessible. The host may have refreshed or revoked their sharing link.'}
          </p>
          <Link to="/">
            <Button variant="primary">Visit Utsav Home</Button>
          </Link>
        </div>
      </main>
    );
  }

  const { event, tasks = [], vendors = [] } = data;

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Date not specified';

  return (
    <main className={styles.container}>
      {/* Top Navbar */}
      <header className={styles.topBar}>
        <Link to="/" className={styles.brand} aria-label="Utsav Home">
          <span>🎊</span>
          <span>Utsav</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Shared Host Notice */}
      <aside className={styles.sharedBanner} aria-label="Share notice">
        <span aria-hidden="true">🤝</span>
        <div>
          <strong>Shared by Host:</strong> You are viewing a read-only coordination view of this celebration.
        </div>
      </aside>

      {/* Hero Event Card */}
      <section className={styles.heroCard} aria-labelledby="event-title-heading">
        <h1 id="event-title-heading" className={styles.eventTitle}>
          {event.name}
        </h1>

        <div className={styles.metaRow}>
          <span className={styles.pill}>
            🎉 {event.type ? event.type.toUpperCase() : 'CELEBRATION'}
          </span>
          <span className={styles.pill}>📍 {event.city || 'TBA'}</span>
          <span className={styles.pill}>📅 {formattedDate}</span>
          <span className={styles.pill}>👥 {event.guest_count} Expected Guests</span>
          {event.vibe && <span className={styles.pill}>✨ {event.vibe}</span>}
        </div>
      </section>

      {/* Timeline & Vendors Split Grid */}
      <div className={styles.sectionGrid}>
        {/* Tasks & Milestones */}
        <section className={styles.panelCard} aria-labelledby="timeline-heading">
          <div className={styles.panelHeader}>
            <h2 id="timeline-heading" className={styles.panelTitle}>
              📅 Planning Timeline
            </h2>
            <span className={styles.badgeCount}>{tasks.length} items</span>
          </div>

          {tasks.length > 0 ? (
            <div className={styles.list}>
              {tasks.map((task, idx) => {
                const isDone = task.status === 'done';
                return (
                  <div key={idx} className={styles.listItem}>
                    <div className={styles.itemMain}>
                      <span className={styles.itemTitle}>
                        {isDone ? '✓ ' : '○ '}
                        {task.title}
                      </span>
                      <span className={styles.itemSub}>
                        {task.category || 'General'}
                        {task.due_date &&
                          ` • Target: ${new Date(task.due_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}`}
                      </span>
                    </div>
                    <span
                      className={`${styles.statusTag} ${
                        isDone ? styles['statusTag--done'] : styles['statusTag--todo']
                      }`}
                    >
                      {task.status || 'todo'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>No milestones published yet.</div>
          )}
        </section>

        {/* Confirmed Vendors */}
        <section className={styles.panelCard} aria-labelledby="vendors-heading">
          <div className={styles.panelHeader}>
            <h2 id="vendors-heading" className={styles.panelTitle}>
              🤝 Team & Partners
            </h2>
            <span className={styles.badgeCount}>{vendors.length} vendors</span>
          </div>

          {vendors.length > 0 ? (
            <div className={styles.list}>
              {vendors.map((vendor, idx) => {
                const status = (vendor.status || 'booked').toLowerCase();
                const isConfirmed = status === 'booked' || status === 'confirmed';
                return (
                  <div key={idx} className={styles.listItem}>
                    <div className={styles.itemMain}>
                      <span className={styles.itemTitle}>{vendor.name}</span>
                      <span className={styles.itemSub}>{vendor.category || 'Vendor Partner'}</span>
                    </div>
                    <span
                      className={`${styles.statusTag} ${
                        isConfirmed ? styles['statusTag--booked'] : styles['statusTag--pending']
                      }`}
                    >
                      {vendor.status || 'booked'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>No vendors assigned yet.</div>
          )}
        </section>
      </div>
    </main>
  );
}
