import { useState, useId } from 'react';
import styles from './Tabs.module.css';

/**
 * Accessible tabs component with keyboard navigation (arrow keys).
 * @param {{ label: string, content: React.ReactNode }[]} items
 */
export default function Tabs({ items = [], defaultIndex = 0, className = '' }) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const baseId = useId();

  const handleKeyDown = (e, index) => {
    let newIndex = index;
    if (e.key === 'ArrowRight') newIndex = (index + 1) % items.length;
    else if (e.key === 'ArrowLeft') newIndex = (index - 1 + items.length) % items.length;
    else if (e.key === 'Home') newIndex = 0;
    else if (e.key === 'End') newIndex = items.length - 1;
    else return;

    e.preventDefault();
    setActiveIndex(newIndex);
    document.getElementById(`${baseId}-tab-${newIndex}`)?.focus();
  };

  return (
    <div className={className}>
      <div className={styles.tabs} role="tablist" aria-label="Tabs">
        {items.map((item, i) => (
          <button
            key={i}
            id={`${baseId}-tab-${i}`}
            className={`${styles.tab} ${i === activeIndex ? styles['tab--active'] : ''}`}
            role="tab"
            aria-selected={i === activeIndex}
            aria-controls={`${baseId}-panel-${i}`}
            tabIndex={i === activeIndex ? 0 : -1}
            onClick={() => setActiveIndex(i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          id={`${baseId}-panel-${i}`}
          className={styles.panel}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${i}`}
          hidden={i !== activeIndex}
          tabIndex={0}
        >
          {i === activeIndex && item.content}
        </div>
      ))}
    </div>
  );
}
