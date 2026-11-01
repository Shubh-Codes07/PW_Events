import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams, Link } from 'react-router-dom';
import ThemeToggle from '../../ThemeToggle/ThemeToggle';
import { SkipToContent, Skeleton, Button } from '../../ui';
import { EventProvider, useEvent } from '../../../context/EventContext';
import { useAuth } from '../../../context/AuthContext';
import styles from './AppShell.module.css';
import FloatingAssistant from '../../assistant/FloatingAssistant';

function ShellContent() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event, userEvents, loading, error, refreshEvent } = useEvent();
  const { user, isGuest, signOut } = useAuth();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('[SIGN OUT ERROR]:', err);
    }
  };

  const navItems = [
    { to: `/dashboard/${eventId}`, icon: '📊', label: 'Overview', end: true },
    { to: `/dashboard/${eventId}/budget`, icon: '💰', label: 'Budget' },
    { to: `/dashboard/${eventId}/timeline`, icon: '📅', label: 'Timeline' },
    { to: `/dashboard/${eventId}/vendors`, icon: '🤝', label: 'Vendors' },
    { to: `/dashboard/${eventId}/ideas`, icon: '💡', label: 'Ideas' },
    { to: `/dashboard/${eventId}/memories`, icon: '📸', label: 'Memories' },
  ];

  const handleEventSwitch = (e) => {
    const val = e.target.value;
    if (val === 'new') {
      navigate('/onboarding');
    } else if (val && val !== eventId) {
      navigate(`/dashboard/${val}`);
    }
  };

  const linkClass = ({ isActive }) =>
    `${styles.navLink} ${isActive ? styles['navLink--active'] : ''}`;

  const bottomLinkClass = ({ isActive }) =>
    `${styles.bottomLink} ${isActive ? styles['bottomLink--active'] : ''}`;

  return (
    <>
      <SkipToContent />
      <div className={styles.shell}>
        {/* Desktop Sidebar */}
        <aside className={styles.sidebar} aria-label="Main navigation">
          <div className={styles.logo}>
            <div className={styles.logoBrand}>
              <span className={styles.logoEmoji} aria-hidden="true">
                🎊
              </span>
              <span>Utsav</span>
            </div>
          </div>

          {/* Event Switcher */}
          <div className={styles.eventSwitcherWrapper}>
            <label htmlFor="event-switcher-desktop" className={styles.eventSwitcherLabel}>
              Current Celebration
            </label>
            <select
              id="event-switcher-desktop"
              className={styles.eventSwitcherSelect}
              value={eventId || ''}
              onChange={handleEventSwitch}
              aria-label="Select celebration"
            >
              {userEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.city || 'Event'})
                </option>
              ))}
              <option value="new">+ Plan New Celebration</option>
            </select>
          </div>

          {/* Navigation Links */}
          <nav className={styles.nav}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={linkClass}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.sidebarFooter}>
            <div className={styles.accountArea}>
              <div className={styles.userRow}>
                {isGuest ? (
                  <span className={styles.guestBadge}>Guest</span>
                ) : (
                  <span className={styles.userEmail} title={user?.email || ''}>
                    {user?.email || 'Host'}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                >
                  Sign out
                </Button>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </aside>

        {/* Main Content Area */}
        <main id="main-content" className={styles.main}>
          {/* Mobile Header */}
          <div className={styles.mobileHeader}>
            <div className={styles.mobileHeaderTop}>
              <div className={styles.logoBrand}>
                <span className={styles.logoEmoji} aria-hidden="true">
                  🎊
                </span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 'bold' }}>
                  Utsav
                </span>
              </div>
              <div className={styles.mobileRight}>
                {isGuest && <span className={styles.guestBadge}>Guest</span>}
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                >
                  Sign out
                </Button>
              </div>
            </div>

            <select
              id="event-switcher-mobile"
              className={styles.eventSwitcherSelect}
              value={eventId || ''}
              onChange={handleEventSwitch}
              aria-label="Select celebration"
            >
              {userEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
              <option value="new">+ Plan New Celebration</option>
            </select>
          </div>

          {/* Slim, Dismissible Guest Banner */}
          {isGuest && !bannerDismissed && (
            <div className={styles.guestBanner} role="status" aria-label="Guest session notice">
              <div className={styles.guestBannerContent}>
                <span aria-hidden="true">💡</span>
                <span>
                  You&apos;re using a guest session.{' '}
                  <Link to="/login" className={styles.guestBannerLink}>
                    Sign in with email
                  </Link>{' '}
                  to keep your events on any device.
                </span>
              </div>
              <button
                type="button"
                className={styles.guestBannerDismiss}
                onClick={() => setBannerDismissed(true)}
                aria-label="Dismiss guest notice"
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
              aria-busy="true"
              aria-label="Loading celebration details"
            >
              <Skeleton variant="title" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <Skeleton variant="card" height="120px" />
                <Skeleton variant="card" height="120px" />
                <Skeleton variant="card" height="120px" />
              </div>
              <Skeleton variant="card" height="200px" />
            </div>
          ) : error ? (
            <div
              style={{
                padding: 'var(--space-6)',
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-danger)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                alignItems: 'flex-start',
              }}
              role="alert"
            >
              <h3>Unable to load celebration</h3>
              <p>{error}</p>
              <Button variant="danger" size="sm" onClick={refreshEvent}>
                Retry Loading
              </Button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <div className={styles.bottomBar} aria-label="Mobile navigation">
          <nav className={styles.bottomNav}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={bottomLinkClass}
              >
                <span className={styles.bottomIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Floating AI Assistant */}
        <FloatingAssistant />
      </div>
    </>
  );
}

export default function AppShell() {
  return (
    <EventProvider>
      <ShellContent />
    </EventProvider>
  );
}
