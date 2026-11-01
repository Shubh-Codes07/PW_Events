import { describe, it, expect } from 'vitest';
import {
  rebalanceCategories,
  getBudgetStatus,
  groupTasksByUrgency,
  getCountdown,
} from '../lib/dashboardUtils';

describe('rebalanceCategories', () => {
  const initialCategories = [
    { id: '1', name: 'Venue', planned_amount: 40000 },
    { id: '2', name: 'Catering', planned_amount: 30000 },
    { id: '3', name: 'Decor', planned_amount: 20000 },
    { id: '4', name: 'Music', planned_amount: 10000 },
  ];
  const totalBudget = 100000;

  it('proportionally rebalances other categories when one category increases', () => {
    // Increase Venue from 40k to 55k (needs 15k shaved from others)
    const rebalanced = rebalanceCategories(initialCategories, '1', 55000, totalBudget);

    const venue = rebalanced.find((c) => c.id === '1');
    expect(venue.planned_amount).toBe(55000);

    const sum = rebalanced.reduce((acc, c) => acc + c.planned_amount, 0);
    expect(sum).toBe(totalBudget);

    // Other categories should have reduced proportionally
    const catering = rebalanced.find((c) => c.id === '2');
    expect(catering.planned_amount).toBeLessThan(30000);
  });

  it('proportionally rebalances other categories when one category decreases', () => {
    // Decrease Venue from 40k to 20k (20k extra distributed to others)
    const rebalanced = rebalanceCategories(initialCategories, '1', 20000, totalBudget);

    const venue = rebalanced.find((c) => c.id === '1');
    expect(venue.planned_amount).toBe(20000);

    const sum = rebalanced.reduce((acc, c) => acc + c.planned_amount, 0);
    expect(sum).toBe(totalBudget);

    const catering = rebalanced.find((c) => c.id === '2');
    expect(catering.planned_amount).toBeGreaterThan(30000);
  });

  it('clamps changes to total budget when new amount is too high', () => {
    const rebalanced = rebalanceCategories(initialCategories, '1', 120000, totalBudget);
    const venue = rebalanced.find((c) => c.id === '1');
    expect(venue.planned_amount).toBe(totalBudget);

    const sum = rebalanced.reduce((acc, c) => acc + c.planned_amount, 0);
    expect(sum).toBe(totalBudget);
  });
});

describe('getBudgetStatus', () => {
  it('returns ok (green/success) under 80%', () => {
    const status = getBudgetStatus(100000, 50000); // 50%
    expect(status.status).toBe('ok');
    expect(status.color).toBe('success');
    expect(status.label).toBe('On Track');
    expect(status.percentage).toBe(50);
  });

  it('returns warning (amber) between 80% and 100%', () => {
    const status = getBudgetStatus(100000, 85000); // 85%
    expect(status.status).toBe('warning');
    expect(status.color).toBe('warning');
    expect(status.label).toBe('Near Limit');
  });

  it('returns danger (red) when over 100%', () => {
    const status = getBudgetStatus(100000, 115000); // 115%
    expect(status.status).toBe('danger');
    expect(status.color).toBe('danger');
    expect(status.label).toBe('Over Budget');
  });
});

describe('groupTasksByUrgency', () => {
  const getOffsetDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  it('correctly categorizes overdue, this week, next 30 days, later, and done tasks', () => {
    const tasks = [
      { id: '1', title: 'Late task', due_date: getOffsetDate(-3), status: 'todo' },
      { id: '2', title: 'Due soon', due_date: getOffsetDate(4), status: 'todo' },
      { id: '3', title: 'Next month', due_date: getOffsetDate(18), status: 'todo' },
      { id: '4', title: 'Far away', due_date: getOffsetDate(60), status: 'todo' },
      { id: '5', title: 'Finished task', due_date: getOffsetDate(-10), status: 'done' },
    ];

    const groups = groupTasksByUrgency(tasks);

    expect(groups.overdue).toHaveLength(1);
    expect(groups.overdue[0].id).toBe('1');
    expect(groups.overdue[0].daysDiff).toBe(3);

    expect(groups.thisWeek).toHaveLength(1);
    expect(groups.thisWeek[0].id).toBe('2');

    expect(groups.next30Days).toHaveLength(1);
    expect(groups.next30Days[0].id).toBe('3');

    expect(groups.later).toHaveLength(1);
    expect(groups.later[0].id).toBe('4');

    expect(groups.done).toHaveLength(1);
    expect(groups.done[0].id).toBe('5');
  });
});

describe('getCountdown', () => {
  it('identifies future dates with remaining days', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const countdown = getCountdown(future.toISOString().split('T')[0]);
    expect(countdown.state).toBe('future');
    expect(countdown.days).toBe(10);
  });

  it('identifies today', () => {
    const today = new Date().toISOString().split('T')[0];
    const countdown = getCountdown(today);
    expect(countdown.state).toBe('today');
    expect(countdown.text).toContain('Today!');
  });
});
