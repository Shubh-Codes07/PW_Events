import { Button, Modal } from '../../../components/ui';
import { formatINR } from '../../../lib/currency';
import styles from '../Budget.module.css';

export default function BudgetRescueModal({
  isOpen,
  onClose,
  rescuePlan,
  onAcceptRescue,
  isApplyingRescue,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🚨 Utsav AI Budget Rescue"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Dismiss
          </Button>
          <Button
            variant="accent"
            onClick={onAcceptRescue}
            disabled={isApplyingRescue || !rescuePlan?.adjustments?.length}
          >
            {isApplyingRescue ? 'Applying...' : 'Accept All Adjustments ✓'}
          </Button>
        </>
      }
    >
      {rescuePlan && (
        <div className={styles.rescueModalContent}>
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)' }}>
            {rescuePlan.summary}
          </p>

          <div>
            <h3
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Proposed Adjustments
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {rescuePlan.adjustments?.length > 0 ? (
                rescuePlan.adjustments.map((adj, i) => (
                  <div
                    key={i}
                    className={`${styles.adjustmentItem} ${
                      adj.action === 'increase'
                        ? styles['adjustmentItem--increase']
                        : styles['adjustmentItem--reduce']
                    }`}
                  >
                    <div className={styles.adjustmentDetails}>
                      <strong>{adj.category}</strong>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {adj.reason}
                      </span>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
                      {adj.action === 'increase' ? '+' : '-'}
                      {formatINR(adj.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  No critical adjustments needed.
                </p>
              )}
            </div>
          </div>

          {rescuePlan.tradeoffs?.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                Practical Tradeoffs & Tips
              </h3>
              <ul className={styles.tradeoffsList}>
                {rescuePlan.tradeoffs.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

