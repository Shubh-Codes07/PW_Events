import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';

const ToastContext = createContext(null);

let toastId = 0;

/** Hook to show toast notifications. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/**
 * Toast provider — wrap your app with this.
 * Provides `addToast({ message, type, duration })`.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ message, type = 'info', duration = 5000 }) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {createPortal(
        <div className={styles.container} aria-live="polite" aria-label="Notifications">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`${styles.toast} ${styles[`toast--${toast.type}`] || ''}`}
              role="status"
            >
              <span className={styles.message}>{toast.message}</span>
              <button
                className={styles.close}
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
