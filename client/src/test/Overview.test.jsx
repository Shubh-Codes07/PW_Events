import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Overview from '../pages/dashboard/Overview';
import * as EventContextModule from '../context/EventContext';
import { ToastProvider } from '../components/ui';

describe('Overview Page Component', () => {
  const mockUpdateTask = vi.fn();
  const mockRegenerateShareToken = vi.fn();

  const mockEvent = {
    id: 'ev-test-1',
    name: 'Ananya & Rohan Sangeet',
    type: 'wedding',
    city: 'Jaipur',
    guest_count: 250,
    event_date: '2026-12-15',
    share_token: 'valid-share-token-1234567890',
  };

  const mockTasks = [
    { id: 't-1', title: 'Book Dhol Players', due_date: '2026-11-10', status: 'todo' },
    { id: 't-2', title: 'Mehendi Artist Deposit', due_date: '2026-11-15', status: 'done' },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockUpdateTask.mockReset();
    mockRegenerateShareToken.mockReset();

    vi.spyOn(EventContextModule, 'useEvent').mockReturnValue({
      eventId: 'ev-test-1',
      event: mockEvent,
      tasks: mockTasks,
      totalBudget: 1500000,
      totalSpent: 600000,
      totalRemaining: 900000,
      taskStats: { total: 2, completed: 1, pending: 1, percent: 50 },
      nextBestAction: { id: 't-1', title: 'Book Dhol Players' },
      updateTask: mockUpdateTask,
      regenerateShareToken: mockRegenerateShareToken,
    });
  });

  it('renders celebration header with countdown and metadata', () => {
    render(
      <ToastProvider>
        <MemoryRouter>
          <Overview />
        </MemoryRouter>
      </ToastProvider>,
    );

    expect(screen.getByText('Ananya & Rohan Sangeet')).toBeInTheDocument();
    expect(screen.getByText(/📍 Jaipur/i)).toBeInTheDocument();
    expect(screen.getByText(/👥 250 Guests/i)).toBeInTheDocument();
  });

  it('renders financial and milestone summary metrics', () => {
    render(
      <ToastProvider>
        <MemoryRouter>
          <Overview />
        </MemoryRouter>
      </ToastProvider>,
    );

    expect(screen.getAllByText('₹15,00,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('₹6,00,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('₹9,00,000').length).toBeGreaterThanOrEqual(1);
  });

  it('displays next best action and allows marking it as complete', async () => {
    mockUpdateTask.mockResolvedValue({});

    render(
      <ToastProvider>
        <MemoryRouter>
          <Overview />
        </MemoryRouter>
      </ToastProvider>,
    );

    expect(screen.getAllByText('Book Dhol Players').length).toBeGreaterThanOrEqual(1);

    const markDoneBtn = screen.getByRole('button', { name: /Mark Complete/i });
    fireEvent.click(markDoneBtn);

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('t-1', { status: 'done' });
    });
  });

  it('opens share modal with link and supports token rotation', async () => {
    mockRegenerateShareToken.mockResolvedValue({});
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <ToastProvider>
        <MemoryRouter>
          <Overview />
        </MemoryRouter>
      </ToastProvider>,
    );

    const shareBtn = screen.getByRole('button', { name: /Share read-only plan/i });
    fireEvent.click(shareBtn);

    expect(screen.getByRole('heading', { name: /Share Celebration Plan/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue(/valid-share-token-1234567890/i)).toBeInTheDocument();

    const rotateBtn = screen.getByRole('button', { name: /Rotate Link/i });
    fireEvent.click(rotateBtn);

    await waitFor(() => {
      expect(mockRegenerateShareToken).toHaveBeenCalledTimes(1);
    });
  });
});
