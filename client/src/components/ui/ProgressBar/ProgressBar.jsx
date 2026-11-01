import styles from './ProgressBar.module.css';

/**
 * Accessible progress bar with label and screen-reader text.
 * @param {number} value – current value (0–100)
 * @param {'primary'|'accent'|'success'|'warning'|'danger'} color
 */
export default function ProgressBar({
  value = 0,
  max = 100,
  label,
  showPercent = true,
  color = 'primary',
  className = '',
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fillClass = [
    styles.fill,
    color !== 'primary' && styles[`fill--${color}`],
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className={styles.label}>
          {label && <span>{label}</span>}
          {showPercent && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div className={fillClass} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
