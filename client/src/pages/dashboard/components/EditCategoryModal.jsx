import { Button, Input, Modal } from '../../../components/ui';
import { formatINR } from '../../../lib/currency';

export default function EditCategoryModal({
  editingCategory,
  onClose,
  editAmountStr,
  setEditAmountStr,
  autoRebalance,
  setAutoRebalance,
  onSaveCategory,
  isUpdatingCategory,
  totalBudget,
}) {
  return (
    <Modal
      isOpen={Boolean(editingCategory)}
      onClose={onClose}
      title={`Edit Planned Allocation: ${editingCategory?.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSaveCategory} disabled={isUpdatingCategory}>
            {isUpdatingCategory ? 'Saving...' : 'Save Allocation'}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Input
          label="New Planned Amount (₹) *"
          value={editAmountStr}
          onChange={(e) => setEditAmountStr(e.target.value)}
          hint={`Current: ${formatINR(editingCategory?.planned_amount || 0)}`}
        />

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={autoRebalance}
            onChange={(e) => setAutoRebalance(e.target.checked)}
          />
          <span>
            <strong>Auto-rebalance other categories proportionally</strong> so total budget stays strictly at {formatINR(totalBudget)}.
          </span>
        </label>
      </div>
    </Modal>
  );
}

