import styles from './Skeleton.module.css';

/**
 * Skeleton loading placeholder.
 * @param {'text'|'title'|'avatar'|'card'} variant
 */
export default function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  ...rest
}) {
  const classes = [styles.skeleton, styles[`skeleton--${variant}`], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={{ width, height }}
      aria-hidden="true"
      {...rest}
    />
  );
}
