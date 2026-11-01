import styles from './Card.module.css';

/**
 * A surface container with optional interactive hover.
 * @param {boolean} interactive – enable hover lift effect
 * @param {boolean} flush – remove padding
 */
export default function Card({
  interactive = false,
  flush = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    styles.card,
    interactive && styles['card--interactive'],
    flush && styles['card--flush'],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
