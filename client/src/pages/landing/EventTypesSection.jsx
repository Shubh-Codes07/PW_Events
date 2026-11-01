import { Link } from 'react-router-dom';
import styles from '../Landing.module.css';

export default function EventTypesSection() {
  return (
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
  );
}

