import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from '../pages/Landing';
import * as AuthContextModule from '../context/AuthContext';

describe('Landing Page Component (Step 4b)', () => {
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

  it('renders the main heading, Start planning CTA, and "Try the demo" button when logged out', () => {
    // Mock user as logged out
    const mockSignInGuest = vi.fn().mockResolvedValue({ user: { is_anonymous: true } });
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signInAsGuest: mockSignInGuest,
    });

    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    // 1. Verify main heading
    const heading = screen.getByRole('heading', {
      level: 1,
      name: /Plan any celebration, without the chaos\./i,
    });
    expect(heading).toBeInTheDocument();

    // 2. Verify primary CTA button
    const primaryCta = screen.getByRole('button', { name: /^Start planning$/i });
    expect(primaryCta).toBeInTheDocument();

    // 3. Verify auth-aware button shows "Try the demo" when logged out, plus a "Sign in" link
    const demoBtn = screen.getByRole('button', { name: /^Try the demo$/i });
    expect(demoBtn).toBeInTheDocument();

    const signInLinks = screen.getAllByRole('link', { name: /^Sign in$/i });
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    expect(signInLinks[0]).toHaveAttribute('href', '/login');
  });

  it('shows "Go to dashboard" button linking to /dashboard when user is logged in', () => {
    // Mock user as authenticated
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'usr-1', email: 'host@utsav.app' },
      session: { access_token: 'valid-token' },
      loading: false,
    });

    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    const dashboardBtn = screen.getByRole('link', { name: /Go to dashboard/i });
    expect(dashboardBtn).toBeInTheDocument();
    expect(dashboardBtn).toHaveAttribute('href', '/dashboard');
  });
});
