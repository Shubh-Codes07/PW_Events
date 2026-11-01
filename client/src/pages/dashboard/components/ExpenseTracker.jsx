import { Button, Input, Select } from '../../../components/ui';
import { formatINR } from '../../../lib/currency';
import styles from '../Budget.module.css';

export default function ExpenseTracker({
  expenses,
  categories,
  categoryOptions,
  expenseDesc,
  setExpenseDesc,
  expenseAmount,
  setExpenseAmount,
  expenseCatId,
  setExpenseCatId,
  isAddingExpense,
  onAddExpense,
  onDeleteExpense,
}) {
  return (
    <div className={styles.expenseSection}>
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Record Actual Expenses</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
          Log bills, advances, and vendor payments to keep real-time track of outflows.
        </p>
      </div>

      {/* Add Expense Form */}
      <form className={styles.expenseForm} onSubmit={onAddExpense}>
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
                      onClick={() => onDeleteExpense(exp.id)}
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
              <td
                colSpan="5"
                style={{
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  padding: 'var(--space-6)',
                }}
              >
                No expenses recorded yet. Use the form above to add your first bill or payment receipt!
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

