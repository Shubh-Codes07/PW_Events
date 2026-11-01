import { useTheme } from '../../hooks/useTheme';
import styles from './ThemeToggle.module.css';

/** Toggle between light and dark theme, respects system preference. */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      className={styles.toggle}
      onClick={toggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      type="button"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
