/**
 * Hides content visually while keeping it accessible to screen readers.
 * Uses the established .visually-hidden class from global.css.
 */
export default function VisuallyHidden({ children, as: Tag = 'span', ...rest }) {
  return (
    <Tag className="visually-hidden" {...rest}>
      {children}
    </Tag>
  );
}
