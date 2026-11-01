/**
 * Rebalances remaining categories proportionally when one category's planned amount changes,
 * ensuring the sum of all categories strictly equals totalBudget.
 *
 * @param {Array<{ id: string, name: string, planned_amount: number }>} categories
 * @param {string} changedCategoryId
 * @param {number} newAmount
 * @param {number} totalBudget
 * @returns {Array<{ id: string, name: string, planned_amount: number }>}
 */
export function rebalanceCategories(categories, changedCategoryId, newAmount, totalBudget) {
  if (!categories || categories.length === 0) return [];

  const target = Math.round(Number(totalBudget) || 0);
  const clampedNewAmount = Math.max(0, Math.min(Math.round(Number(newAmount) || 0), target));

  const otherCategories = categories.filter((c) => c.id !== changedCategoryId);
  if (otherCategories.length === 0) {
    return [{ ...categories[0], planned_amount: target }];
  }

  const remainingBudget = target - clampedNewAmount;

  // Calculate current sum of other categories
  const currentOtherSum = otherCategories.reduce(
    (acc, c) => acc + (Number(c.planned_amount) || 0),
    0,
  );

  let updatedOthers;
  if (currentOtherSum > 0) {
    // Distribute remainingBudget proportionally
    updatedOthers = otherCategories.map((c) => ({
      ...c,
      planned_amount: Math.round(((Number(c.planned_amount) || 0) / currentOtherSum) * remainingBudget),
    }));
  } else {
    // Distribute evenly if all were 0
    const evenShare = Math.floor(remainingBudget / otherCategories.length);
    updatedOthers = otherCategories.map((c) => ({
      ...c,
      planned_amount: evenShare,
    }));
  }

  // Adjust any rounding difference on the largest other category
  const allocatedSum = updatedOthers.reduce((acc, c) => acc + c.planned_amount, 0);
  const diff = remainingBudget - allocatedSum;

  if (diff !== 0 && updatedOthers.length > 0) {
    let largestIndex = 0;
    for (let i = 1; i < updatedOthers.length; i++) {
      if (updatedOthers[i].planned_amount > updatedOthers[largestIndex].planned_amount) {
        largestIndex = i;
      }
    }
    updatedOthers[largestIndex].planned_amount = Math.max(
      0,
      updatedOthers[largestIndex].planned_amount + diff,
    );
  }

  // Reconstruct list in original order
  return categories.map((cat) => {
    if (cat.id === changedCategoryId) {
      return { ...cat, planned_amount: clampedNewAmount };
    }
    return updatedOthers.find((o) => o.id === cat.id) || cat;
  });
}

/**
 * Returns budget status and color coding based on spending percentage.
 * Under 80%: on track (success / green)
 * 80% to 100%: near limit (warning / amber)
 * Over 100%: over budget (danger / red)
 *
 * @param {number} planned
 * @param {number} spent
 * @returns {{ percentage: number, status: 'ok'|'warning'|'danger', label: string, color: 'success'|'warning'|'danger' }}
 */
export function getBudgetStatus(planned, spent) {
  const p = Number(planned) || 0;
  const s = Number(spent) || 0;

  if (p <= 0) {
    return {
      percentage: s > 0 ? 100 : 0,
      status: s > 0 ? 'danger' : 'ok',
      label: s > 0 ? 'Over Budget' : 'On Track',
      color: s > 0 ? 'danger' : 'success',
    };
  }

  const ratio = (s / p) * 100;
  const percentage = Math.round(ratio);

  if (ratio > 100) {
    return {
      percentage,
      status: 'danger',
      label: 'Over Budget',
      color: 'danger',
    };
  }
  if (ratio >= 80) {
    return {
      percentage,
      status: 'warning',
      label: 'Near Limit',
      color: 'warning',
    };
  }
  return {
    percentage,
    status: 'ok',
    label: 'On Track',
    color: 'success',
  };
}

/**
 * Groups a list of tasks by urgency based on current date.
 * Urgencies: Overdue, This week (<= 7 days), Next 30 days (<= 30 days), Later (> 30 days / no date), Done.
 *
 * @param {Array<{ id: string, title: string, due_date?: string, status: string }>} tasks
 * @returns {Record<'overdue'|'thisWeek'|'next30Days'|'later'|'done', Array<any>>}
 */
export function groupTasksByUrgency(tasks = []) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const groups = {
    overdue: [],
    thisWeek: [],
    next30Days: [],
    later: [],
    done: [],
  };

  tasks.forEach((task) => {
    if (task.status === 'done') {
      groups.done.push(task);
      return;
    }

    if (!task.due_date) {
      groups.later.push(task);
      return;
    }

    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((dueDate - now) / 86400000);

    if (diffDays < 0) {
      groups.overdue.push({ ...task, daysDiff: Math.abs(diffDays) });
    } else if (diffDays <= 7) {
      groups.thisWeek.push({ ...task, daysDiff: diffDays });
    } else if (diffDays <= 30) {
      groups.next30Days.push({ ...task, daysDiff: diffDays });
    } else {
      groups.later.push({ ...task, daysDiff: diffDays });
    }
  });

  return groups;
}

/**
 * Calculates countdown details from target event date.
 * E.g., returns days remaining, "Today!", or "Event passed".
 *
 * @param {string} eventDateStr
 * @returns {{ days: number, text: string, state: 'future'|'today'|'passed' }}
 */
export function getCountdown(eventDateStr) {
  if (!eventDateStr) return { days: 0, text: 'Date to be decided', state: 'future' };

  const target = new Date(eventDateStr);
  target.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target - now) / 86400000);

  if (diffDays === 0) {
    return { days: 0, text: 'Today! 🎉', state: 'today' };
  }
  if (diffDays < 0) {
    return { days: Math.abs(diffDays), text: `${Math.abs(diffDays)} days ago (Event passed)`, state: 'passed' };
  }
  return { days: diffDays, text: `${diffDays} days to go`, state: 'future' };
}
