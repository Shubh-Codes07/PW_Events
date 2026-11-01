import { useState, useMemo } from 'react';
import { useEvent } from '../../context/EventContext';
import { groupTasksByUrgency } from '../../lib/dashboardUtils';
import { Button, Input, Modal, useToast } from '../../components/ui';
import styles from './Timeline.module.css';

export default function Timeline() {
  const { tasks, addTask, updateTask, deleteTask } = useEvent();
  const { addToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Quick Add Task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [isAdding, setIsAdding] = useState(false);

  // Edit Task modal state
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [isUpdating, setIsUpdating] = useState(false);

  // Available unique categories
  const categoriesList = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [tasks]);

  // Filter tasks by selected category
  const filteredTasks = useMemo(() => {
    if (selectedCategory === 'ALL') return tasks;
    return tasks.filter((t) => t.category === selectedCategory);
  }, [tasks, selectedCategory]);

  // Group filtered tasks by urgency
  const urgencyGroups = useMemo(
    () => groupTasksByUrgency(filteredTasks),
    [filteredTasks],
  );

  // Handle Add Task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      addToast({ message: 'Please enter a task title.', type: 'warning' });
      return;
    }

    setIsAdding(true);
    try {
      await addTask({
        title: newTitle.trim(),
        due_date: newDate || null,
        category: newCategory.trim() || 'General',
        priority: 1,
        status: 'todo',
      });
      setNewTitle('');
      setNewDate('');
      setNewCategory('General');
    } catch (err) {
      addToast({ message: err.message || 'Failed to create task', type: 'error' });
    } finally {
      setIsAdding(false);
    }
  };

  // Toggle Done state
  const handleToggleDone = async (task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await updateTask(task.id, { status: nextStatus });
    } catch (err) {
      addToast({ message: 'Failed to update task status', type: 'error' });
    }
  };

  // Open Edit Modal
  const openEditModal = (task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDate(task.due_date || '');
    setEditCategory(task.category || 'General');
  };

  // Save Task Edits
  const handleSaveEdit = async () => {
    if (!editingTask || !editTitle.trim()) return;
    setIsUpdating(true);
    try {
      await updateTask(editingTask.id, {
        title: editTitle.trim(),
        due_date: editDate || null,
        category: editCategory.trim() || 'General',
      });
      addToast({ message: 'Task updated!', type: 'success' });
      setEditingTask(null);
    } catch (err) {
      addToast({ message: err.message || 'Failed to update task', type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper to render a group section
  const renderGroupSection = (title, items, isOverdue = false) => {
    if (items.length === 0) return null;

    return (
      <section
        className={styles.section}
        aria-label={`${title} (${items.length} milestones)`}
      >
        <div
          className={`${styles.sectionHeader} ${
            isOverdue ? styles['sectionHeader--overdue'] : ''
          }`}
        >
          <span>
            {isOverdue && '⚠️ '}
            {title} ({items.length})
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {items.map((task) => (
            <div
              key={task.id}
              className={`${styles.taskItem} ${
                isOverdue ? styles['taskItem--overdue'] : ''
              }`}
            >
              <div className={styles.taskLeft}>
                <input
                  type="checkbox"
                  className={styles.taskCheckbox}
                  checked={task.status === 'done'}
                  onChange={() => handleToggleDone(task)}
                  aria-label={`Mark task '${task.title}' as ${
                    task.status === 'done' ? 'incomplete' : 'complete'
                  }`}
                />
                <div className={styles.taskDetails}>
                  <span
                    className={`${styles.taskTitle} ${
                      task.status === 'done' ? styles['taskTitle--done'] : ''
                    }`}
                  >
                    {task.title}
                  </span>
                  <div className={styles.taskMeta}>
                    <span>Category: {task.category || 'General'}</span>
                    {task.due_date && (
                      <span>
                        Due: {new Date(task.due_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                    {isOverdue && (
                      <span className={styles.overdueText} role="status">
                        ⚠️ Overdue by {task.daysDiff} day{task.daysDiff === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.taskActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(task)}
                  aria-label={`Edit milestone '${task.title}'`}
                >
                  ✏️ Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTask(task.id)}
                  aria-label={`Delete milestone '${task.title}'`}
                >
                  🗑️
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Celebration Timeline</h1>
          <p className={styles.subtitle}>
            Track key milestones, vendor meetings, and deadlines to stay stress-free.
          </p>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className={styles.filterRow} role="radiogroup" aria-label="Filter tasks by category">
        {categoriesList.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`${styles.filterChip} ${
              selectedCategory === cat ? styles['filterChip--active'] : ''
            }`}
            onClick={() => setSelectedCategory(cat)}
            aria-checked={selectedCategory === cat}
            role="radio"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Quick Add Task Form */}
      <form className={styles.addForm} onSubmit={handleAddTask}>
        <Input
          label="Milestone Title *"
          placeholder="e.g. Schedule photographer meeting"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          required
        />
        <Input
          type="date"
          label="Due Date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
        />
        <Input
          label="Category"
          placeholder="e.g. Catering, Venue"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={isAdding}>
          {isAdding ? 'Adding...' : '+ Add Milestone'}
        </Button>
      </form>

      {/* Urgency Groups */}
      {renderGroupSection('Overdue Milestones', urgencyGroups.overdue, true)}
      {renderGroupSection('Due This Week', urgencyGroups.thisWeek)}
      {renderGroupSection('Next 30 Days', urgencyGroups.next30Days)}
      {renderGroupSection('Later & Upcoming', urgencyGroups.later)}
      {renderGroupSection('Completed Milestones', urgencyGroups.done)}

      {tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
          No milestones added yet. Add a milestone above to start your planning timeline!
        </div>
      )}

      {/* Edit Task Modal */}
      <Modal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        title="Edit Milestone"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Title *"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />
          <Input
            type="date"
            label="Due Date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
          <Input
            label="Category"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
