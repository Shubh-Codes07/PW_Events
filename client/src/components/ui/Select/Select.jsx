import { forwardRef, useId } from 'react';
import styles from './Select.module.css';

/**
 * Accessible select dropdown with label and error support.
 * @param {{ value: string, label: string }[]} options
 */
const Select = forwardRef(function Select(
  { label, options = [], error, placeholder, className = '', id: propId, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = propId || autoId;
  const errorId = error ? `${fieldId}-error` : undefined;

  const selectClasses = [
    styles.select,
    error && styles['select--error'],
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
      <select
        ref={ref}
        id={fieldId}
        className={selectClasses}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

export default Select;
