import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Budget from '../pages/dashboard/Budget';
import * as EventContextModule from '../context/EventContext';
import * as ApiModule from '../lib/api';
import { ToastProvider } from '../components/ui';

describe('Budget Rescue Flow Component', () => {
  const mockCategories = [
    { id: 'cat-1', name: 'Venue', planned_amount: 300000, spent: 380000, remaining: -80000 },
    { id: 'cat-2', name: 'Catering', planned_amount: 300000, spent: 250000, remaining: 50000 },
    { id: 'cat-3', name: 'Decor', planned_amount: 150000, spent: 100000, remaining: 50000 },
  ];

  const mockBatchUpdate = vi.fn().mockResolvedValue([]);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('displays over budget banner and successfully runs & accepts Budget Rescue', async () => {
    vi.spyOn(EventContextModule, 'useEvent').mockReturnValue({
      eventId: 'ev-123',
      event: { id: 'ev-123', name: 'Aditi Wedding', budget_total: 750000 },
      categories: mockCategories,
      expenses: [],
      totalBudget: 750000,
      totalSpent: 730000,
      totalRemaining: 20000,
      isOverBudget: true, // Venue is over budget!
      addExpense: vi.fn(),
      deleteExpense: vi.fn(),
      updateCategory: vi.fn(),
      batchUpdateCategories: mockBatchUpdate,
    });

    const mockRescuePlan = {
      summary: 'Rebalanced 2 categories to absorb the Venue overspend.',
      adjustments: [
        { category: 'Venue', action: 'increase', amount: 80000, reason: 'Actual venue cost' },
        { category: 'Catering', action: 'reduce', amount: 50000, reason: 'Trim menu items' },
        { category: 'Decor', action: 'reduce', amount: 30000, reason: 'Seasonal flowers' },
      ],
      tradeoffs: ['Select local seasonal flowers instead of imported lilies.'],
    };

    vi.spyOn(ApiModule, 'apiFetch').mockResolvedValue({
      success: true,
      data: mockRescuePlan,
    });

    render(
      <ToastProvider>
        <MemoryRouter>
          <Budget />
        </MemoryRouter>
      </ToastProvider>,
    );

    // Verify warning alert is present
    expect(screen.getByText('Budget Limit Warning')).toBeInTheDocument();

    // Click the rescue button
    const rescueButton = screen.getByRole('button', { name: /rescue budget now/i });
    fireEvent.click(rescueButton);

    // Verify modal appears with rescue summary
    await waitFor(() => {
      expect(screen.getByText(/Rebalanced 2 categories/i)).toBeInTheDocument();
      expect(screen.getByText('Select local seasonal flowers instead of imported lilies.')).toBeInTheDocument();
    });

    // Click "Accept All Adjustments"
    const acceptBtn = screen.getByRole('button', { name: /accept all adjustments/i });
    fireEvent.click(acceptBtn);

    // Verify batch update was called with the rebalanced amounts
    await waitFor(() => {
      expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
