/**
 * Skip to main content link for keyboard users.
 * Uses the established .skip-to-content class from global.css.
 * @param {string} targetId – the id of the main content area (default: "main-content")
 */
export default function SkipToContent({ targetId = 'main-content' }) {
  return (
    <a className="skip-to-content" href={`#${targetId}`}>
      Skip to main content
    </a>
  );
}
