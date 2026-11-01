import { forwardRef } from 'react';
import styles from './Button.module.css';

/**
 * Accessible button component with variant and size props.
 * @param {'primary'|'accent'|'outline'|'ghost'|'danger'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} fullWidth
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', fullWidth = false, className = '', children, ...rest },
  ref,
) {
  const classes = [
    styles.btn,
    styles[`btn--${variant}`],
    size !== 'md' && styles[`btn--${size}`],
    fullWidth && styles['btn--full'],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} className={classes} {...rest}>
      {children}
    </button>
  );
});

export default Button;
