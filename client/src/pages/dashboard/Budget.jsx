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
  ProgressBar,
  useToast,
} from '../../components/ui';
import DonutChart from '../../components/charts/DonutChart';
import styles from './Budget.module.css';
import BudgetRescueModal from './components/BudgetRescueModal';
import EditCategoryModal from './components/EditCategoryModal';
import ExpenseTracker from './components/ExpenseTracker';

export default function Budget() {
  const {
    eventId,
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
      setExpenseCatId('');
    } catch (err) {
      addToast({ message: err.message || 'Failed to record expense', type: 'error' });
    } finally {
      setIsAddingExpense(false);
    }
  };

  // Open Edit Category
  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setEditAmountStr(cat.planned_amount.toString());
    setAutoRebalance(true);
  };

  // Save Category Edit
  const handleSaveCategory = async () => {
    if (!editingCategory) return;
    const newAmount = parseINR(editAmountStr);
    if (newAmount < 0) {
      addToast({ message: 'Please enter a valid amount.', type: 'warning' });
      return;
    }

    setIsUpdatingCategory(true);
    try {
      if (autoRebalance) {
        const rebalanced = rebalanceCategories(
          categories,
          editingCategory.id,
          newAmount,
          totalBudget,
        );
        await batchUpdateCategories(
          rebalanced.map((c) => ({
            id: c.id,
            planned_amount: c.planned_amount,
          })),
        );
        addToast({
          message: 'Allocations updated & other categories proportionally rebalanced.',
          type: 'success',
        });
      } else {
        await updateCategory(editingCategory.id, { planned_amount: newAmount });
        addToast({ message: 'Category allocation updated.', type: 'success' });
      }
      setEditingCategory(null);
    } catch (err) {
      addToast({ message: err.message || 'Failed to update category', type: 'error' });
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  // Run Budget Rescue
  const handleRunRescue = async () => {
    setIsRescuing(true);
    try {
      const res = await apiFetch(`/events/${eventId}/budget-rescue`, {
        method: 'POST',
      });
      setRescuePlan(res.data);
      setRescueModalOpen(true);
    } catch (err) {
      addToast({ message: err.message || 'Budget rescue failed. Please try again.', type: 'error' });
    } finally {
      setIsRescuing(false);
    }
  };

  // Accept Rescue Adjustments
  const handleAcceptRescue = async () => {
    if (!rescuePlan || !rescuePlan.adjustments || rescuePlan.adjustments.length === 0) return;

    setIsApplyingRescue(true);
    try {
      const updates = [];
      for (const adj of rescuePlan.adjustments) {
        const cat = categories.find(
          (c) => c.name.toLowerCase() === adj.category.toLowerCase(),
        );
        if (cat) {
          const delta = adj.action === 'increase' ? adj.amount : -adj.amount;
          const newPlanned = Math.max(0, cat.planned_amount + delta);
          updates.push({ id: cat.id, planned_amount: newPlanned });
        }
      }

      if (updates.length > 0) {
        await batchUpdateCategories(updates);
        addToast({ message: 'Budget Rescue adjustments successfully applied!', type: 'success' });
      }
      setRescueModalOpen(false);
      setRescuePlan(null);
    } catch (err) {
      addToast({ message: err.message || 'Could not apply rescue adjustments.', type: 'error' });
    } finally {
      setIsApplyingRescue(false);
    }
  };

  return (
    <div className={styles.container}>
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
          <Button variant="danger" size="sm" onClick={handleRunRescue} disabled={isRescuing}>
            Rescue Budget Now →
          </Button>
        </div>
      )}

      {/* Top Financial Stat Cards */}
      <div className={styles.statGrid}>
        <Card className={styles.statCard}>
          <div className={styles.statLabel}>Total Budget</div>
          <div className={styles.statValue}>{formatINR(totalBudget)}</div>
          <div className={styles.statHint}>Target celebration spend</div>
        </Card>

        <Card className={styles.statCard}>
          <div className={styles.statLabel}>Total Actual Outflow</div>
          <div className={styles.statValue}>{formatINR(totalSpent)}</div>
          <div className={styles.statHint}>Recorded payments & advances</div>
        </Card>

        <Card className={styles.statCard}>
          <div className={styles.statLabel}>Remaining Funds</div>
          <div
            className={styles.statValue}
            style={{
              color: isOverBudget ? 'var(--color-danger)' : 'var(--color-success)',
            }}
          >
            {formatINR(totalRemaining)}
          </div>
          <div className={styles.statHint}>
            {isOverBudget ? 'Over allocated budget' : 'Available for pending expenses'}
          </div>
        </Card>
      </div>

      {/* Chart & Category Allocation Section */}
      <div className={styles.categorySection}>
        <div className={styles.chartCol}>
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
            Category Distribution
          </h2>
          <DonutChart
            slices={categorySlices}
            centerLabel="Actual Outflow"
            centerValue={formatINR(totalSpent)}
            title="Category allocation breakdown"
          />
        </div>

        <div className={styles.listCol}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 'var(--text-lg)' }}>Planned Category Allocations</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunRescue}
              disabled={isRescuing}
            >
              {isRescuing ? 'Analyzing...' : 'AI Budget Advisor'}
            </Button>
          </div>

          <table className={styles.table}>
            <caption className="visually-hidden">Budget allocation by category</caption>
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
      <ExpenseTracker
        expenses={expenses}
        categories={categories}
        categoryOptions={categoryOptions}
        expenseDesc={expenseDesc}
        setExpenseDesc={setExpenseDesc}
        expenseAmount={expenseAmount}
        setExpenseAmount={setExpenseAmount}
        expenseCatId={expenseCatId}
        setExpenseCatId={setExpenseCatId}
        isAddingExpense={isAddingExpense}
        onAddExpense={handleAddExpense}
        onDeleteExpense={deleteExpense}
      />

      {/* Edit Category Planned Amount Modal with Proportional Rebalance */}
      <EditCategoryModal
        editingCategory={editingCategory}
        onClose={() => setEditingCategory(null)}
        editAmountStr={editAmountStr}
        setEditAmountStr={setEditAmountStr}
        autoRebalance={autoRebalance}
        setAutoRebalance={setAutoRebalance}
        onSaveCategory={handleSaveCategory}
        isUpdatingCategory={isUpdatingCategory}
        totalBudget={totalBudget}
      />

      {/* Budget Rescue AI Modal */}
      <BudgetRescueModal
        isOpen={rescueModalOpen}
        onClose={() => setRescueModalOpen(false)}
        rescuePlan={rescuePlan}
        onAcceptRescue={handleAcceptRescue}
        isApplyingRescue={isApplyingRescue}
      />
    </div>
  );
}
