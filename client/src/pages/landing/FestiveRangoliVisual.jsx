import styles from '../Landing.module.css';

export default function FestiveRangoliVisual() {
  return (
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
  );
}

