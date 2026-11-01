import { useState, useMemo } from 'react';
import { useEvent } from '../../context/EventContext';
import { formatINR, parseINR } from '../../lib/currency';
import {
  getBudgetStatus,
  rebalanceCategories,
} from '../../lib/dashboardUtils';
import { apiFetch } from '../../lib/api';
import {
  Button,
  Card,
  Input,
  Select,
  Modal,
  ProgressBar,
  useToast,
} from '../../components/ui';
import DonutChart from '../../components/charts/DonutChart';
import styles from './Budget.module.css';

export default function Budget() {
  const {
    eventId,
    event,
    categories,
    expenses,
    totalBudget,
    totalSpent,
    totalRemaining,
    isOverBudget,
    addExpense,
    deleteExpense,
    updateCategory,
    batchUpdateCategories,
  } = useEvent();

  const { addToast } = useToast();

  // New Expense form state
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCatId, setExpenseCatId] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Edit category modal state
  const [editingCategory, setEditingCategory] = useState(null);
  const [editAmountStr, setEditAmountStr] = useState('');
  const [autoRebalance, setAutoRebalance] = useState(true);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);

  // Budget Rescue state
  const [rescueModalOpen, setRescueModalOpen] = useState(false);
  const [isRescuing, setIsRescuing] = useState(false);
  const [rescuePlan, setRescuePlan] = useState(null);
  const [isApplyingRescue, setIsApplyingRescue] = useState(false);

  // Expense Category Options
  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'General / Uncategorized' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  // Donut chart slices from categories
  const categorySlices = useMemo(() => {
    const palette = [
      '#3B1F5C',
      '#F4A300',
      '#0E7B3F',
      '#BE123C',
      '#6B5E7A',
      '#2563EB',
      '#D97706',
    ];
    return categories.map((cat, i) => ({
      label: cat.name,
      value: cat.spent > 0 ? cat.spent : cat.planned_amount,
      color: palette[i % palette.length],
    }));
  }, [categories]);

  // Handle Add Expense
  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amount = parseINR(expenseAmount);
    if (!expenseDesc.trim()) {
      addToast({ message: 'Please enter a description for the expense.', type: 'warning' });
      return;
    }
    if (amount <= 0) {
      addToast({ message: 'Please enter a valid amount greater than ₹0.', type: 'warning' });
      return;
    }

    setIsAddingExpense(true);
    try {
      await addExpense({
        category_id: expenseCatId || null,
        description: expenseDesc.trim(),
        amount,
      });
      setExpenseDesc('');
      setExpenseAmount('');
    } catch (err) {
      addToast({ message: err.message || 'Failed to add expense', type: 'error' });
    } finally {
      setIsAddingExpense(false);
    }
  };

  // Open Edit Category Modal
  const openEditCategory = (category) => {
    setEditingCategory(category);
    setEditAmountStr(category.planned_amount.toString());
    setAutoRebalance(true);
  };

  // Save Category Edit
  const handleSaveCategory = async () => {
    if (!editingCategory) return;
    const newAmount = parseINR(editAmountStr);
    setIsUpdatingCategory(true);

    try {
      if (autoRebalance) {
        // Compute proportional rebalance
        const rebalanced = rebalanceCategories(
          categories,
          editingCategory.id,
          newAmount,
          totalBudget,
        );
        const updates = rebalanced.map((c) => ({
          id: c.id,
          planned_amount: c.planned_amount,
        }));
        await batchUpdateCategories(updates);
      } else {
        await updateCategory(editingCategory.id, { planned_amount: newAmount });
        addToast({ message: 'Category planned amount updated!', type: 'success' });
      }
      setEditingCategory(null);
    } catch (err) {
      addToast({ message: err.message || 'Failed to update category', type: 'error' });
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  // Trigger Budget Rescue AI
  const handleTriggerRescue = async () => {
    setIsRescuing(true);
    try {
      const res = await apiFetch(`/events/${eventId}/budget-rescue`, {
        method: 'POST',
      });
      setRescuePlan(res.data);
      setRescueModalOpen(true);
    } catch (err) {
      addToast({
        message: err.message || 'Failed to run Budget Rescue. Please try again.',
        type: 'error',
      });
    } finally {
      setIsRescuing(false);
    }
  };

  // Accept Budget Rescue Plan
  const handleAcceptRescue = async () => {
    if (!rescuePlan || !rescuePlan.adjustments) return;
    setIsApplyingRescue(true);

    try {
      // Map adjustments to categories
      const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c]));
      const updates = [];

      rescuePlan.adjustments.forEach((adj) => {
        const cat = categoryMap.get(adj.category.toLowerCase().trim());
        if (cat) {
          const current = Number(cat.planned_amount) || 0;
          const adjusted =
            adj.action === 'increase'
              ? current + Number(adj.amount)
              : Math.max(0, current - Number(adj.amount));
          updates.push({ id: cat.id, planned_amount: Math.round(adjusted) });
        }
      });

      if (updates.length > 0) {
        await batchUpdateCategories(updates);
        addToast({ message: 'Budget Rescue adjustments applied!', type: 'success' });
      }
      setRescueModalOpen(false);
    } catch (err) {
      addToast({ message: err.message || 'Failed to apply rescue plan', type: 'error' });
    } finally {
      setIsApplyingRescue(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Budget Planner</h1>
          <p className={styles.subtitle}>
            Manage allocations, record actual vendor spend, and rebalance effortlessly.
          </p>
        </div>

        <Button
          variant={isOverBudget ? 'danger' : 'accent'}
          onClick={handleTriggerRescue}
          disabled={isRescuing}
          aria-label="Run Budget Rescue analysis"
        >
          {isRescuing ? 'Analyzing with AI...' : isOverBudget ? '🚨 Run Budget Rescue' : '✨ AI Budget Optimization'}
        </Button>
      </div>

      {/* Prominent Budget Alert when over plan */}
      {isOverBudget && (
        <div className={styles.rescueBanner} role="alert">
          <div className={styles.rescueText}>
            <div className={styles.rescueTitle}>
              <span>⚠️</span>
              <span>Budget Limit Warning</span>
            </div>
            <div className={styles.rescueDesc}>
              One or more categories or your total spending has exceeded the planned allocation.
              Use Budget Rescue to rebalance without expanding your total debt.
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={handleTriggerRescue} disabled={isRescuing}>
            Rescue Budget Now →
          </Button>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Budget</div>
          <div className={styles.statValue} style={{ color: 'var(--color-primary)' }}>
            {formatINR(totalBudget)}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Spent</div>
          <div className={styles.statValue}>{formatINR(totalSpent)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Remaining Funds</div>
          <div
            className={styles.statValue}
            style={{
              color: totalRemaining < 0 ? 'var(--color-danger)' : 'var(--color-success)',
            }}
          >
            {totalRemaining < 0 ? `- ${formatINR(Math.abs(totalRemaining))}` : formatINR(totalRemaining)}
          </div>
        </div>
      </div>

      {/* Donut Chart & Category Table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
        <Card>
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
            Allocation Breakdown
          </h2>
          <DonutChart
            slices={categorySlices}
            centerLabel="Total Planned"
            centerValue={formatINR(totalBudget)}
            title="Category allocation visual"
            showTable={true}
          />
        </Card>

        {/* Categories Table */}
        <div className={styles.tableContainer}>
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
            Categories & Allocations
          </h2>
          <table className={styles.table}>
            <caption className="visually-hidden">Budget categories and planned versus actual spending</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Planned</th>
                <th scope="col">Spent</th>
                <th scope="col">Remaining</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const status = getBudgetStatus(cat.planned_amount, cat.spent);
                return (
                  <tr key={cat.id}>
                    <td>
                      <strong>{cat.name}</strong>
                    </td>
                    <td>{formatINR(cat.planned_amount)}</td>
                    <td>{formatINR(cat.spent)}</td>
                    <td style={{ color: cat.remaining < 0 ? 'var(--color-danger)' : 'inherit' }}>
                      {formatINR(cat.remaining)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '110px' }}>
                        <span
                          className={`${styles.statusBadge} ${styles[`statusBadge--${status.color}`]}`}
                        >
                          {status.label} ({status.percentage}%)
                        </span>
                        <ProgressBar
                          value={status.percentage}
                          showPercent={false}
                          color={status.color}
                        />
                      </div>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditCategory(cat)}
                        aria-label={`Edit planned amount for ${cat.name}`}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses Tracker Section */}
      <div className={styles.expenseSection}>
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>Record Actual Expenses</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
            Log bills, advances, and vendor payments to keep real-time track of outflows.
          </p>
        </div>

        {/* Add Expense Form */}
        <form className={styles.expenseForm} onSubmit={handleAddExpense}>
          <Input
            label="Description *"
            placeholder="e.g. Venue booking token advance"
            value={expenseDesc}
            onChange={(e) => setExpenseDesc(e.target.value)}
            required
          />
          <Input
            label="Amount (₹) *"
            placeholder="e.g. 50,000"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            required
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={expenseCatId}
            onChange={(e) => setExpenseCatId(e.target.value)}
          />
          <Button type="submit" variant="primary" disabled={isAddingExpense}>
            {isAddingExpense ? 'Adding...' : '+ Add Expense'}
          </Button>
        </form>

        {/* Expense History Table */}
        <table className={styles.table}>
          <caption className="visually-hidden">List of recorded expenses</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Description</th>
              <th scope="col">Category</th>
              <th scope="col">Amount</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length > 0 ? (
              expenses.map((exp) => {
                const cat = categories.find((c) => c.id === exp.category_id);
                return (
                  <tr key={exp.id}>
                    <td>
                      {new Date(exp.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td>{exp.description}</td>
                    <td>{cat ? cat.name : 'General'}</td>
                    <td>
                      <strong>{formatINR(exp.amount)}</strong>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteExpense(exp.id)}
                        aria-label={`Delete expense ${exp.description}`}
                      >
                        🗑️
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-6)' }}>
                  No expenses recorded yet. Use the form above to add your first bill or payment receipt!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Category Planned Amount Modal with Proportional Rebalance */}
      <Modal
        isOpen={Boolean(editingCategory)}
        onClose={() => setEditingCategory(null)}
        title={`Edit Planned Allocation: ${editingCategory?.name}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingCategory(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCategory} disabled={isUpdatingCategory}>
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

          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
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

      {/* Budget Rescue AI Modal */}
      <Modal
        isOpen={rescueModalOpen}
        onClose={() => setRescueModalOpen(false)}
        title="🚨 Utsav AI Budget Rescue"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRescueModalOpen(false)}>
              Dismiss
            </Button>
            <Button
              variant="accent"
              onClick={handleAcceptRescue}
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
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
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
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
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
    </div>
  );
}
