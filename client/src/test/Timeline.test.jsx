import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Timeline from '../pages/dashboard/Timeline';
import * as EventContextModule from '../context/EventContext';
import { ToastProvider } from '../components/ui';

describe('Timeline Page Component', () => {
  const mockAddTask = vi.fn();
  const mockUpdateTask = vi.fn();
  const mockDeleteTask = vi.fn();

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Finalize Catering Menu',
      category: 'Catering',
      due_date: '2026-11-05',
      status: 'todo',
    },
    {
      id: 'task-2',
      title: 'Book Panditji / Officiant',
      category: 'Rituals',
      due_date: '2026-11-20',
      status: 'done',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockAddTask.mockReset();
    mockUpdateTask.mockReset();
    mockDeleteTask.mockReset();

    vi.spyOn(EventContextModule, 'useEvent').mockReturnValue({
      tasks: mockTasks,
      addTask: mockAddTask,
      updateTask: mockUpdateTask,
      deleteTask: mockDeleteTask,
    });
  });

  it('renders tasks and category filter tabs', () => {
    render(
      <ToastProvider>
        <Timeline />
      </ToastProvider>,
    );

    expect(screen.getByText('Finalize Catering Menu')).toBeInTheDocument();
    expect(screen.getByText('Book Panditji / Officiant')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'ALL' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Catering' })).toBeInTheDocument();
  });

  it('filters tasks when clicking category chip', () => {
    render(
      <ToastProvider>
        <Timeline />
      </ToastProvider>,
    );

    const cateringChip = screen.getByRole('radio', { name: 'Catering' });
    fireEvent.click(cateringChip);

    expect(screen.getByText('Finalize Catering Menu')).toBeInTheDocument();
    expect(screen.queryByText('Book Panditji / Officiant')).not.toBeInTheDocument();
  });

  it('adds a new task through quick-add form', async () => {
    mockAddTask.mockResolvedValue({ id: 'task-3', title: 'Order Floral Garland' });

    render(
      <ToastProvider>
        <Timeline />
      </ToastProvider>,
    );

    const titleInput = screen.getByPlaceholderText(/e\.g\. Schedule photographer meeting/i);
    fireEvent.change(titleInput, { target: { value: 'Order Floral Garland' } });

    const addBtn = screen.getByRole('button', { name: /\+ Add Milestone/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Order Floral Garland',
        }),
      );
    });
  });

  it('toggles task status when checking checkbox', async () => {
    mockUpdateTask.mockResolvedValue({});

    render(
      <ToastProvider>
        <Timeline />
      </ToastProvider>,
    );

    const checkbox = screen.getByLabelText(/Mark task 'Finalize Catering Menu' as complete/i);
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { status: 'done' });
    });
  });

  it('opens edit modal and saves changes', async () => {
    mockUpdateTask.mockResolvedValue({});

    render(
      <ToastProvider>
        <Timeline />
      </ToastProvider>,
    );

    const editBtn = screen.getByRole('button', { name: /Edit milestone 'Finalize Catering Menu'/i });
    fireEvent.click(editBtn);

    expect(screen.getByRole('heading', { name: /Edit Milestone/i })).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          title: 'Finalize Catering Menu',
        }),
      );
    });
  });
});
