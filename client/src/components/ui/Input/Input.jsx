import { forwardRef, useId } from 'react';
import styles from './Input.module.css';

/**
 * Accessible text input with label, error message, and hint.
 * Renders a <textarea> when multiline is true.
 */
const Input = forwardRef(function Input(
  { label, error, hint, multiline = false, className = '', id: propId, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = propId || autoId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const Tag = multiline ? 'textarea' : 'input';

  const inputClasses = [
    styles.input,
    multiline && styles.textarea,
    error && styles['input--error'],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
        </label>
      )}
      <Tag
        ref={ref}
        id={fieldId}
        className={inputClasses}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
});

export default Input;
