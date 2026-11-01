import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle/ThemeToggle';
import { Button, SkipToContent } from '../components/ui';
import styles from './Landing.module.css';
import FestiveRangoliVisual from './landing/FestiveRangoliVisual';
import EventTypesSection from './landing/EventTypesSection';
import HowItWorksSection from './landing/HowItWorksSection';
import FeaturesSection from './landing/FeaturesSection';

export default function Landing() {
  const { user, signInAsGuest } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleTryDemo = async () => {
    setIsSigningIn(true);
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
          // ignore error checking previous events
        }
      }
      navigate(hasEvents ? '/dashboard' : '/onboarding');
    } catch {
      navigate('/login');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleStartPlanning = async () => {
    if (user) {
      navigate('/onboarding');
      return;
    }
    setIsSigningIn(true);
    try {
      await signInAsGuest();
      navigate('/onboarding');
    } catch {
      navigate('/onboarding');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Accessible Skip Link */}
      <SkipToContent targetId="main-content" />

      {/* -------------------------------------------------------------
          1. HEADER
          ------------------------------------------------------------- */}
      <header className={styles.header} id="top">
        <div className={styles.headerInner}>
          <div className={styles.brandGroup}>
            <Link to="/" className={styles.brandLink}>
              <span className={styles.brandIcon} aria-hidden="true">
                🪔
              </span>
              <span className={styles.brandName}>Utsav</span>
            </Link>
          </div>

          <div className={styles.headerRight}>
            <ThemeToggle />

            {user ? (
              <Link to="/dashboard">
                <Button variant="primary" size="sm">
                  Go to dashboard →
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTryDemo}
                  disabled={isSigningIn}
                >
                  {isSigningIn ? 'Loading demo...' : 'Try the demo'}
                </Button>
                <Link to="/login" className={styles.headerSignInLink}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------
          MAIN CONTENT LANDMARK
          ------------------------------------------------------------- */}
      <main id="main-content" className={styles.main}>
        {/* -----------------------------------------------------------
            2. HERO SECTION
            ----------------------------------------------------------- */}
        <section className={`${styles.sectionContainer} ${styles.hero}`} aria-labelledby="hero-heading">
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <div className={styles.taglineBadge}>
                <span aria-hidden="true">✨</span>
                <span>GenAI Celebration & Event Planner</span>
              </div>

              <h1 id="hero-heading" className={styles.heroHeadline}>
                Plan any celebration, without the chaos.
              </h1>

              <p className={styles.heroSubline}>
                Utsav is your AI planning assistant for weddings, birthdays and community events:
                smart budgets in ₹, timelines, vendor checklists, personalized ideas, and a memory
                wall your guests can add to with a single QR scan.
              </p>

              <div className={styles.heroCtas}>
                <Button
                  variant="accent"
                  size="lg"
                  onClick={handleStartPlanning}
                  disabled={isSigningIn}
                >
                  Start planning
                </Button>

                <a href="#how-it-works" className={styles.secondaryAnchor}>
                  See how it works
                </a>
              </div>
            </div>

            {/* Festive CSS/SVG Rangoli Visual (Aria-Hidden) */}
            <FestiveRangoliVisual />
          </div>
        </section>

        {/* -----------------------------------------------------------
            3. EVENT TYPE CARDS
            ----------------------------------------------------------- */}
        <EventTypesSection />

        {/* -----------------------------------------------------------
            4. HOW IT WORKS (id="how-it-works")
            ----------------------------------------------------------- */}
        <HowItWorksSection />

        {/* -----------------------------------------------------------
            5. FEATURES GRID
            ----------------------------------------------------------- */}
        <FeaturesSection />
      </main>

      {/* -------------------------------------------------------------
          6. FOOTER
          ------------------------------------------------------------- */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerText}>
            Built for Google PromptWars Challenge 5
          </div>

          <div className={styles.footerLinks}>
            <Link to="/login" className={styles.footerLink}>
              Sign in
            </Link>
            <a href="#top" className={styles.footerLink}>
              Back to top ↑
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
