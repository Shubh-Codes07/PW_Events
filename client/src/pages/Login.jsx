import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { Button, Input } from '../components/ui';
import styles from './Login.module.css';

export default function Login() {
  const { user, signIn, signInAsGuest, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [guestError, setGuestError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guestSubmitting, setGuestSubmitting] = useState(false);

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (user && !authLoading) {
      const target = location.state?.from?.pathname || '/dashboard';
      navigate(target, { replace: true });
    }
  }, [user, authLoading, navigate, location.state]);

  const handleGuestSignIn = async () => {
    setGuestError('');
    setError('');
    setGuestSubmitting(true);
    try {
      const data = await signInAsGuest();
      let hasEvents = false;
      if (data?.session?.access_token) {
        try {
          const res = await apiFetch('/events', {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          });
          hasEvents = Array.isArray(res.data) && res.data.length > 0;
        } catch {
          // If check fails, default to onboarding
        }
      }
      const target = location.state?.from?.pathname || (hasEvents ? '/dashboard' : '/onboarding');
      navigate(target, { replace: true });
    } catch (err) {
      setGuestError(
        err.message || 'Unable to start guest session. Please use email sign in below.',
      );
    } finally {
      setGuestSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setGuestError('');
    setSuccess(false);

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(trimmed);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to send magic link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logoEmoji} role="img" aria-label="Celebration">
            🎊
          </span>
          <h1 className={styles.title}>Welcome to Utsav</h1>
          <p className={styles.subtitle}>
            Experience AI celebration planning in seconds with zero signup required.
          </p>
        </div>

        {/* -----------------------------------------------------------
            1. PROMINENT ONE-CLICK GUEST ACCESS
            ----------------------------------------------------------- */}
        <div className={styles.guestSection}>
          {guestError && (
            <div className={`${styles.banner} ${styles['banner--error']}`} role="alert">
              <span>⚠️</span>
              <div>{guestError}</div>
            </div>
          )}

          <Button
            type="button"
            variant="accent"
            size="lg"
            fullWidth
            onClick={handleGuestSignIn}
            disabled={guestSubmitting || submitting}
          >
            {guestSubmitting ? 'Starting guest demo...' : '⚡ Try the demo (no signup)'}
          </Button>

          <p className={styles.guestNote}>
            Instant full access to AI budgets, timeline, vendors, and ideas.
          </p>
        </div>

        {/* -----------------------------------------------------------
            DIVIDER
            ----------------------------------------------------------- */}
        <div className={styles.divider}>
          <span className={styles.dividerText}>or</span>
        </div>

        {/* -----------------------------------------------------------
            2. SECONDARY MAGIC-LINK FORM
            ----------------------------------------------------------- */}
        <h2 className={styles.emailHeading}>
          Or sign in with email to keep your events across devices
        </h2>

        {success ? (
          <div className={`${styles.banner} ${styles['banner--success']}`} role="alert">
            <span>✨</span>
            <div>
              <strong>Magic link sent!</strong> Check your email inbox (and spam folder)
              at <em>{email}</em> to sign in directly.
            </div>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleEmailSubmit} noValidate>
            {error && (
              <div className={`${styles.banner} ${styles['banner--error']}`} role="alert">
                <span>⚠️</span>
                <div>{error}</div>
              </div>
            )}

            <Input
              type="email"
              id="login-email"
              name="email"
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting || guestSubmitting}
              required
              autoComplete="email"
            />

            <Button
              type="submit"
              variant="outline"
              size="md"
              fullWidth
              disabled={submitting || guestSubmitting}
            >
              {submitting ? 'Sending magic link...' : 'Send Magic Sign-In Link'}
            </Button>
          </form>
        )}

        <div className={styles.footerNote}>
          No passwords needed. One click from your email logs you right in.
        </div>
      </div>
    </div>
  );
}
