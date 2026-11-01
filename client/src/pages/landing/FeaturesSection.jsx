import styles from '../Landing.module.css';

export default function FeaturesSection() {
  return (
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
  );
}

