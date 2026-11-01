import styles from '../Landing.module.css';

export default function HowItWorksSection() {
  return (
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
  );
}

