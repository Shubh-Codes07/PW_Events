import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';
import Landing from '../pages/Landing';
import AppShell from '../components/layout/AppShell/AppShell';
import { ToastProvider } from '../components/ui';
import * as AuthContextModule from '../context/AuthContext';
import * as EventContextModule from '../context/EventContext';

describe('Guest Access & One-Click Evaluation (Step 4c Client Tests)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  describe('1. Login Page Guest Access', () => {
    it('renders the guest demo button first and calls signInAsGuest on click', async () => {
      const mockSignInAsGuest = vi.fn().mockResolvedValue({
        user: { id: 'guest-1', is_anonymous: true },
        session: { access_token: 'fake-guest-token' },
      });

      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: null,
        signIn: vi.fn(),
        signInAsGuest: mockSignInAsGuest,
        loading: false,
        isGuest: false,
      });

      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>,
      );

      // Verify prominent guest button is rendered
      const guestBtn = screen.getByRole('button', { name: /Try the demo/i });
      expect(guestBtn).toBeInTheDocument();

      // Click the guest button
      fireEvent.click(guestBtn);

      await waitFor(() => {
        expect(mockSignInAsGuest).toHaveBeenCalledTimes(1);
      });

      // Verify secondary magic-link section is also present
      expect(
        screen.getByRole('heading', {
          name: /Or sign in with email to keep your events across devices/i,
        }),
      ).toBeInTheDocument();
    });
  });

  describe('2. Guest Session Banner in AppShell', () => {
    it('shows the guest banner only when isGuest is true, and allows dismissing it', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { id: 'anon-user-1', is_anonymous: true },
        isGuest: true,
        signOut: vi.fn(),
      });

      vi.spyOn(EventContextModule, 'useEvent').mockReturnValue({
        eventId: 'ev-test',
        event: { id: 'ev-test', name: 'Demo Celebration' },
        userEvents: [{ id: 'ev-test', name: 'Demo Celebration' }],
        loading: false,
        error: null,
        refreshEvent: vi.fn(),
      });

      render(
        <ToastProvider>
          <MemoryRouter>
            <AppShell />
          </MemoryRouter>
        </ToastProvider>,
      );

      // Guest banner should be visible
      const banner = screen.getByLabelText(/Guest session notice/i);
      expect(banner).toBeInTheDocument();
      expect(screen.getByText(/You're using a guest session\./i)).toBeInTheDocument();

      // Click dismiss button
      const dismissBtn = screen.getByRole('button', { name: /Dismiss guest notice/i });
      fireEvent.click(dismissBtn);

      // Banner should disappear
      expect(screen.queryByLabelText(/Guest session notice/i)).not.toBeInTheDocument();
    });

    it('does NOT show the guest banner when user is a permanent email user', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { id: 'email-user-1', email: 'owner@utsav.app', is_anonymous: false },
        isGuest: false,
        signOut: vi.fn(),
      });

      vi.spyOn(EventContextModule, 'useEvent').mockReturnValue({
        eventId: 'ev-test',
        event: { id: 'ev-test', name: 'Demo Celebration' },
        userEvents: [{ id: 'ev-test', name: 'Demo Celebration' }],
        loading: false,
        error: null,
        refreshEvent: vi.fn(),
      });

      render(
        <ToastProvider>
          <MemoryRouter>
            <AppShell />
          </MemoryRouter>
        </ToastProvider>,
      );

      expect(screen.queryByLabelText(/Guest session notice/i)).not.toBeInTheDocument();
    });
  });

  describe('3. Landing Page Hero CTA Guest Flow', () => {
    it('signs in as guest automatically when unauthenticated user clicks Start planning', async () => {
      const mockSignInAsGuest = vi.fn().mockResolvedValue({
        user: { id: 'anon-user-2', is_anonymous: true },
        session: { access_token: 'fake-token' },
      });

      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: null,
        signInAsGuest: mockSignInAsGuest,
      });

      render(
        <MemoryRouter>
          <Landing />
        </MemoryRouter>,
      );

      const startPlanningBtn = screen.getByRole('button', { name: /^Start planning$/i });
      fireEvent.click(startPlanningBtn);

      await waitFor(() => {
        expect(mockSignInAsGuest).toHaveBeenCalledTimes(1);
      });
    });
  });
});
