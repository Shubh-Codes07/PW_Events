import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle/ThemeToggle';
import { Button, SkipToContent } from '../components/ui';
import styles from './Landing.module.css';

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
        } catch {}
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
          <Link to="/" className={styles.brand} aria-label="Utsav Home">
            <span aria-hidden="true">🎊</span>
            <span>Utsav</span>
          </Link>

          <div className={styles.headerActions}>
            <ThemeToggle />
            {user ? (
              <Link to="/dashboard">
                <Button variant="primary" size="sm">
                  Go to dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  variant="accent"
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
            <div className={styles.festiveVisualWrapper} aria-hidden="true">
              <svg
                className={styles.rangoliSvg}
                viewBox="0 0 400 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <radialGradient id="festiveGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
                    <stop offset="60%" stopColor="var(--color-primary)" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="saffronPlum" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-accent)" />
                    <stop offset="100%" stopColor="var(--color-primary)" />
                  </linearGradient>
                </defs>

                {/* Soft backdrop glow */}
                <circle cx="200" cy="200" r="190" fill="url(#festiveGlow)" />

                {/* Outer concentric beaded boundary */}
                <circle
                  cx="200"
                  cy="200"
                  r="170"
                  stroke="var(--color-accent)"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  opacity="0.6"
                />

                {/* 12 Outer Petals Ring */}
                {[...Array(12)].map((_, i) => (
                  <path
                    key={`petal-out-${i}`}
                    d="M200 60 C215 95 215 125 200 140 C185 125 185 95 200 60 Z"
                    fill="url(#saffronPlum)"
                    opacity="0.85"
                    transform={`rotate(${i * 30} 200 200)`}
                  />
                ))}

                {/* Mid ring circle */}
                <circle
                  cx="200"
                  cy="200"
                  r="115"
                  stroke="var(--color-primary)"
                  strokeWidth="3"
                  opacity="0.4"
                />

                {/* 8 Inner Marigold Petals */}
                {[...Array(8)].map((_, i) => (
                  <ellipse
                    key={`petal-in-${i}`}
                    cx="200"
                    cy="135"
                    rx="14"
                    ry="28"
                    fill="var(--color-accent)"
                    opacity="0.9"
                    transform={`rotate(${i * 45} 200 200)`}
                  />
                ))}

                {/* Inner geometric lotus star */}
                <polygon
                  points="200,150 235,185 250,200 235,215 200,250 165,215 150,200 165,185"
                  fill="var(--color-surface)"
                  stroke="var(--color-primary)"
                  strokeWidth="2"
                />

                {/* Center golden bindi / diya core */}
                <circle cx="200" cy="200" r="28" fill="var(--color-accent)" />
                <circle cx="200" cy="200" r="16" fill="var(--color-primary)" />
                <circle cx="200" cy="200" r="6" fill="#FFF9F0" />
              </svg>
            </div>
          </div>
        </section>

        {/* -----------------------------------------------------------
            3. EVENT TYPE CARDS
            ----------------------------------------------------------- */}
        <section className={styles.sectionContainer} aria-labelledby="event-types-heading">
          <div className={styles.sectionHeader}>
            <h2 id="event-types-heading" className={styles.sectionTitle}>
              Crafted for Every Indian Celebration
            </h2>
            <p className={styles.sectionSubtitle}>
              From intimate haldi rituals to grand 500-guest community festivals, Utsav tailors
              budgets and task checklists to your celebration style.
            </p>
          </div>

          <div className={styles.eventTypesGrid}>
            {/* Wedding Card */}
            <Link to="/onboarding" className={styles.eventTypeCard}>
              <span className={styles.cardEmoji} aria-hidden="true">
                💍
              </span>
              <h3 className={styles.cardTitle}>Wedding & Engagement</h3>
              <p className={styles.cardDesc}>
                Ceremonies, multi-day rituals, mandap decor, catering splits, and family coordination.
              </p>
              <span className={styles.cardAction}>
                Start planning wedding →
              </span>
            </Link>

            {/* Birthday Card */}
            <Link to="/onboarding" className={styles.eventTypeCard}>
              <span className={styles.cardEmoji} aria-hidden="true">
                🎂
              </span>
              <h3 className={styles.cardTitle}>Birthday</h3>
              <p className={styles.cardDesc}>
                Milestone themes, entertainment, games, customized cakes, and return favors.
              </p>
              <span className={styles.cardAction}>
                Start planning birthday →
              </span>
            </Link>

            {/* Community Event Card */}
            <Link to="/onboarding" className={styles.eventTypeCard}>
              <span className={styles.cardEmoji} aria-hidden="true">
                🎪
              </span>
              <h3 className={styles.cardTitle}>Community Event</h3>
              <p className={styles.cardDesc}>
                Festivals, campus gatherings, poojas, cultural nights, and volunteer task flows.
              </p>
              <span className={styles.cardAction}>
                Start planning community event →
              </span>
            </Link>
          </div>
        </section>

        {/* -----------------------------------------------------------
            4. HOW IT WORKS (id="how-it-works")
            ----------------------------------------------------------- */}
        <section
          id="how-it-works"
          className={styles.sectionContainer}
          aria-labelledby="how-it-works-heading"
        >
          <div className={styles.sectionHeader}>
            <h2 id="how-it-works-heading" className={styles.sectionTitle}>
              How Utsav Works
            </h2>
            <p className={styles.sectionSubtitle}>
              Four effortless steps to transform an overwhelming celebration into an organized,
              joyous experience.
            </p>
          </div>

          <div className={styles.howItWorksGrid}>
            {/* Step 1 */}
            <div className={styles.stepCard}>
              <div className={styles.stepBadge}>1</div>
              <h3 className={styles.stepTitle}>Tell us about your event</h3>
              <p className={styles.stepDesc}>
                Select celebration type, city, date, guest count, and overall budget in a 4-step
                wizard.
              </p>
            </div>

            {/* Step 2 */}
            <div className={styles.stepCard}>
              <div className={styles.stepBadge}>2</div>
              <h3 className={styles.stepTitle}>
                Get an AI plan with budget, timeline and vendors
              </h3>
              <p className={styles.stepDesc}>
                Instantly receive realistic category allocations in ₹, tailored milestones, and
                essential vendor checklists.
              </p>
            </div>

            {/* Step 3 */}
            <div className={styles.stepCard}>
              <div className={styles.stepBadge}>3</div>
              <h3 className={styles.stepTitle}>Track, adjust and rescue your budget</h3>
              <p className={styles.stepDesc}>
                Log actual expenses and run our automated Budget Rescue if any category begins to
                exceed planned targets.
              </p>
            </div>

            {/* Step 4 */}
            <div className={styles.stepCard}>
              <div className={styles.stepBadge}>4</div>
              <h3 className={styles.stepTitle}>Collect memories with one QR scan</h3>
              <p className={styles.stepDesc}>
                Post-event QR codes allow friends and family to upload celebration photos instantly
                without installing an app or signing in.
              </p>
            </div>
          </div>
        </section>

        {/* -----------------------------------------------------------
            5. FEATURES GRID
            ----------------------------------------------------------- */}
        <section className={styles.sectionContainer} aria-labelledby="features-heading">
          <div className={styles.sectionHeader}>
            <h2 id="features-heading" className={styles.sectionTitle}>
              Everything You Need for a Seamless Celebration
            </h2>
            <p className={styles.sectionSubtitle}>
              Built specifically with Indian celebration realities: Rupee formatting, cultural
              rituals, multi-lingual messaging, and host privacy.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {/* Feature 1 */}
            <div className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                💰
              </span>
              <h3 className={styles.featureTitle}>Smart budget and Budget Rescue</h3>
              <p className={styles.featureDesc}>
                City-calibrated percentage splits in ₹ with intelligent automatic deficit
                rebalancing to prevent unexpected overspending.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                📅
              </span>
              <h3 className={styles.featureTitle}>AI timeline</h3>
              <p className={styles.featureDesc}>
                Chronological milestone checklist mapped backward from your celebration date with
                urgency indicators and next best actions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                🤝
              </span>
              <h3 className={styles.featureTitle}>
                Vendor tracker with enquiries in English, Hindi and Kannada
              </h3>
              <p className={styles.featureDesc}>
                Manage quotes, booking deposits, and draft culturally respectful inquiry messages in
                multiple Indian languages with one tap.
              </p>
            </div>

            {/* Feature 4 */}
            <div className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                💡
              </span>
              <h3 className={styles.featureTitle}>Personalized ideas</h3>
              <p className={styles.featureDesc}>
                Fresh inspiration studio generating themes, stage decor, traditional catering
                menus, games, and return gift concepts tailored to your vibe.
              </p>
            </div>

            {/* Feature 5 */}
            <div className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                🤖
              </span>
              <h3 className={styles.featureTitle}>Planning assistant</h3>
              <p className={styles.featureDesc}>
                A dedicated, context-aware floating companion answering budget, timeline, and vendor
                questions with Indian market realism.
              </p>
            </div>

            {/* Feature 6 */}
            <div className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                📸
              </span>
              <h3 className={styles.featureTitle}>Memory Wall</h3>
              <p className={styles.featureDesc}>
                Frictionless photo and blessing uploads for guests via scannable QR code — no
                account creation or app downloads required.
              </p>
            </div>
          </div>
        </section>
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
