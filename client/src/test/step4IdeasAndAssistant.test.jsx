import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Ideas from '../pages/dashboard/Ideas';
import FloatingAssistant from '../components/assistant/FloatingAssistant';
import * as EventContextModule from '../context/EventContext';
import * as ApiModule from '../lib/api';
import { ToastProvider } from '../components/ui';

describe('Step 4 Client Components (Ideas & Floating Assistant)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Ideas Page (Save toggle and Delete)', () => {
    it('allows toggling save state and deleting an idea card', async () => {
      const mockToggleSave = vi.fn().mockResolvedValue(true);
      const mockDeleteIdea = vi.fn().mockResolvedValue(true);
      const mockGenerateIdeas = vi.fn().mockResolvedValue([]);

      const mockIdeas = [
        {
          id: 'idea-1',
          kind: 'theme',
          title: 'Royal Marwar Heritage',
          body: 'Warm saffron and royal indigo palette with traditional gota patti drapes.',
          estimated_cost_inr: 45000,
          saved: false,
        },
        {
          id: 'idea-2',
          kind: 'theme',
          title: 'Eco-Vedic Minimalist',
          body: 'Terracotta kulhads and potted plant centerpieces.',
          estimated_cost_inr: 25000,
          saved: true,
        },
      ];

      vi.spyOn(EventContextModule, 'useEvent').mockReturnValue({
        eventId: 'ev-1',
        event: { name: 'Priya Sangeet' },
        ideas: mockIdeas,
        generateIdeas: mockGenerateIdeas,
        toggleSaveIdea: mockToggleSave,
        deleteIdea: mockDeleteIdea,
      });

      render(
        <ToastProvider>
          <Ideas />
        </ToastProvider>,
      );

      // Verify idea cards are displayed
      expect(screen.getByText('Royal Marwar Heritage')).toBeInTheDocument();
      expect(screen.getByText('Eco-Vedic Minimalist')).toBeInTheDocument();

      // Click save button on the first idea
      const saveBtn = screen.getByLabelText('Save Royal Marwar Heritage');
      fireEvent.click(saveBtn);
      expect(mockToggleSave).toHaveBeenCalledWith('idea-1', false);

      // Click delete button on the second idea
      const deleteBtn = screen.getByLabelText('Delete idea Eco-Vedic Minimalist');
      fireEvent.click(deleteBtn);
      expect(mockDeleteIdea).toHaveBeenCalledWith('idea-2');
    });
  });

  describe('Floating Assistant (Focus & Esc Behavior)', () => {
    it('manages accessible focus on open and closes cleanly on Escape', async () => {
      vi.spyOn(EventContextModule, 'useEvent').mockReturnValue({
        eventId: 'ev-1',
        event: { name: 'Priya Sangeet' },
      });

      render(
        <ToastProvider>
          <FloatingAssistant />
        </ToastProvider>,
      );

      // Initial state: FAB is rendered and dialog is closed
      const fab = screen.getByRole('button', { name: /Open Utsav AI Planning Assistant/i });
      expect(fab).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Click to open assistant dialog
      fireEvent.click(fab);

      // Dialog is now rendered
      const dialog = screen.getByRole('dialog', { name: /Utsav AI Assistant/i });
      expect(dialog).toBeInTheDocument();

      // Focus should move into the text input
      const input = screen.getByPlaceholderText(/Ask about budget, timeline, vendors/i);
      expect(input).toBeInTheDocument();

      // Wait for requestAnimationFrame to focus the input
      await waitFor(() => {
        expect(document.activeElement).toBe(input);
      });

      // Press Escape key to close dialog
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      // Dialog should close
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Focus should return to the FAB trigger button
      expect(document.activeElement).toBe(fab);
    });
  });
});
