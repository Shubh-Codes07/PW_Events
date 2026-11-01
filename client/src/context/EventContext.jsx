import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/ui';

const EventContext = createContext(null);

export function useEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return ctx;
}

export function EventProvider({ children }) {
  const { eventId } = useParams();
  const { addToast } = useToast();

  const [event, setEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [userEvents, setUserEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load the full event data
  const loadEventData = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [eventRes, userEventsRes, ideasRes] = await Promise.all([
        apiFetch(`/events/${id}`),
        apiFetch('/events'),
        apiFetch(`/events/${id}/ideas`).catch(() => ({ data: [] })),
      ]);

      const data = eventRes.data;
      setEvent(data.event);
      setCategories(data.budget_categories || []);
      setTasks(data.tasks || []);
      setVendors(data.vendors || []);
      setExpenses(data.expenses || []);
      setUserEvents(userEventsRes.data || []);
      setIdeas(ideasRes.data || []);
    } catch (err) {
      console.error('[EVENT LOAD ERROR]:', err);
      setError(err.message || 'Failed to load event');
      addToast({
        message: err.message || 'Could not load event data.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    let ignore = false;
    if (eventId) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadEventData(eventId);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [eventId, loadEventData]);

  /* =====================================================================
     MUTATION HELPERS
     ===================================================================== */

  // Expenses
  const addExpense = useCallback(
    async (payload) => {
      const res = await apiFetch(`/events/${eventId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setExpenses((prev) => [res.data, ...prev]);
      addToast({ message: 'Expense recorded!', type: 'success' });
      return res.data;
    },
    [eventId, addToast],
  );

  const updateExpense = useCallback(
    async (expenseId, payload) => {
      const res = await apiFetch(`/events/${eventId}/expenses/${expenseId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setExpenses((prev) => prev.map((e) => (e.id === expenseId ? res.data : e)));
      addToast({ message: 'Expense updated!', type: 'success' });
      return res.data;
    },
    [eventId, addToast],
  );

  const deleteExpense = useCallback(
    async (expenseId) => {
      await apiFetch(`/events/${eventId}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      addToast({ message: 'Expense deleted.', type: 'info' });
    },
    [eventId, addToast],
  );

  // Categories
  const updateCategory = useCallback(
    async (categoryId, payload) => {
      const res = await apiFetch(`/events/${eventId}/categories/${categoryId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? res.data : c)));
      return res.data;
    },
    [eventId],
  );

  const batchUpdateCategories = useCallback(
    async (categoryUpdates) => {
      const res = await apiFetch(`/events/${eventId}/categories/batch`, {
        method: 'PATCH',
        body: JSON.stringify({ categories: categoryUpdates }),
      });
      setCategories(res.data);
      addToast({ message: 'Budget categories updated!', type: 'success' });
      return res.data;
    },
    [eventId, addToast],
  );

  // Tasks
  const addTask = useCallback(
    async (payload) => {
      const res = await apiFetch(`/events/${eventId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setTasks((prev) => [...prev, res.data]);
      addToast({ message: 'Task added to timeline!', type: 'success' });
      return res.data;
    },
    [eventId, addToast],
  );

  const updateTask = useCallback(
    async (taskId, payload) => {
      const res = await apiFetch(`/events/${eventId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
      return res.data;
    },
    [eventId],
  );

  const deleteTask = useCallback(
    async (taskId) => {
      await apiFetch(`/events/${eventId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      addToast({ message: 'Task removed.', type: 'info' });
    },
    [eventId, addToast],
  );

  // Vendors
  const addVendor = useCallback(
    async (payload) => {
      const res = await apiFetch(`/events/${eventId}/vendors`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setVendors((prev) => [...prev, res.data]);
      addToast({ message: 'Vendor added!', type: 'success' });
      return res.data;
    },
    [eventId, addToast],
  );

  const updateVendor = useCallback(
    async (vendorId, payload) => {
      const res = await apiFetch(`/events/${eventId}/vendors/${vendorId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setVendors((prev) => prev.map((v) => (v.id === vendorId ? res.data : v)));
      return res.data;
    },
    [eventId],
  );

  const deleteVendor = useCallback(
    async (vendorId) => {
      await apiFetch(`/events/${eventId}/vendors/${vendorId}`, {
        method: 'DELETE',
      });
      setVendors((prev) => prev.filter((v) => v.id !== vendorId));
      addToast({ message: 'Vendor removed.', type: 'info' });
    },
    [eventId, addToast],
  );

  // Ideas
  const generateIdeas = useCallback(
    async (kind, refine) => {
      const res = await apiFetch(`/events/${eventId}/ideas/generate`, {
        method: 'POST',
        body: JSON.stringify({ kind, refine }),
      });
      setIdeas((prev) => [...(res.data || []), ...prev]);
      addToast({ message: `New ${kind} ideas generated!`, type: 'success' });
      return res.data;
    },
    [eventId, addToast],
  );

  const toggleSaveIdea = useCallback(
    async (ideaId, currentSaved) => {
      const nextSaved = !currentSaved;
      const res = await apiFetch(`/events/${eventId}/ideas/${ideaId}`, {
        method: 'PATCH',
        body: JSON.stringify({ saved: nextSaved }),
      });
      setIdeas((prev) =>
        prev
          .map((i) => (i.id === ideaId ? res.data : i))
          .sort((a, b) => (b.saved === a.saved ? 0 : b.saved ? 1 : -1)),
      );
      addToast({
        message: nextSaved ? 'Idea saved to favorites! ⭐' : 'Idea removed from saved.',
        type: 'info',
      });
      return res.data;
    },
    [eventId, addToast],
  );

  const deleteIdea = useCallback(
    async (ideaId) => {
      await apiFetch(`/events/${eventId}/ideas/${ideaId}`, {
        method: 'DELETE',
      });
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
      addToast({ message: 'Idea removed.', type: 'info' });
    },
    [eventId, addToast],
  );

  // Share Token Rotation
  const regenerateShareToken = useCallback(async () => {
    const res = await apiFetch(`/events/${eventId}/regenerate-share-token`, {
      method: 'POST',
    });
    setEvent((prev) => ({ ...prev, share_token: res.data.share_token }));
    addToast({ message: 'Share link rotated successfully! Old link deactivated.', type: 'success' });
    return res.data.share_token;
  }, [eventId, addToast]);

  /* =====================================================================
     COMPUTED FINANCIAL & TIMELINE STATS
     ===================================================================== */

  const totalBudget = useMemo(() => Number(event?.budget_total) || 0, [event]);

  const totalSpent = useMemo(
    () => expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
    [expenses],
  );

  const totalRemaining = totalBudget - totalSpent;

  // Category breakdown with calculated spend
  const categoriesWithSpend = useMemo(() => {
    return categories.map((cat) => {
      const catSpent = expenses
        .filter((e) => e.category_id === cat.id)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return {
        ...cat,
        spent: catSpent,
        remaining: (Number(cat.planned_amount) || 0) - catSpent,
      };
    });
  }, [categories, expenses]);

  // Is any category or total over budget?
  const isOverBudget = useMemo(() => {
    if (totalSpent > totalBudget) return true;
    return categoriesWithSpend.some((c) => c.spent > c.planned_amount);
  }, [totalSpent, totalBudget, categoriesWithSpend]);

  // Tasks statistics
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, percentage };
  }, [tasks]);

  // Next Best Action: most urgent undone task
  const nextBestAction = useMemo(() => {
    const undone = tasks.filter((t) => t.status !== 'done');
    if (undone.length === 0) return null;

    return [...undone].sort((a, b) => {
      if (!a.due_date && !b.due_date) return (a.priority || 1) - (b.priority || 1);
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    })[0];
  }, [tasks]);

  const value = {
    eventId,
    event,
    categories: categoriesWithSpend,
    tasks,
    vendors,
    expenses,
    ideas,
    userEvents,
    loading,
    error,
    totalBudget,
    totalSpent,
    totalRemaining,
    isOverBudget,
    taskStats,
    nextBestAction,
    // Actions
    refreshEvent: () => loadEventData(eventId),
    addExpense,
    updateExpense,
    deleteExpense,
    updateCategory,
    batchUpdateCategories,
    addTask,
    updateTask,
    deleteTask,
    addVendor,
    updateVendor,
    deleteVendor,
    generateIdeas,
    toggleSaveIdea,
    deleteIdea,
    regenerateShareToken,
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}
