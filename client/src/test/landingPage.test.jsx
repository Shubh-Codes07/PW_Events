import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from '../pages/Landing';
import * as AuthContextModule from '../context/AuthContext';
import * as ApiModule from '../lib/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Landing Page Component (Step 4b)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
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

  it('calls signInAsGuest and navigates to /onboarding when logged-out user clicks "Start planning"', async () => {
    const mockSignInGuest = vi.fn().mockResolvedValue({
      session: { access_token: 'demo-token' },
    });
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

    const startBtn = screen.getByRole('button', { name: /^Start planning$/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockSignInGuest).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('checks for existing events and navigates when "Try the demo" is clicked', async () => {
    const mockSignInGuest = vi.fn().mockResolvedValue({
      session: { access_token: 'demo-token' },
    });
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signInAsGuest: mockSignInGuest,
    });
    vi.spyOn(ApiModule, 'apiFetch').mockResolvedValue({
      data: [{ id: 'existing-event-1' }],
    });

    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    const demoBtn = screen.getByRole('button', { name: /^Try the demo$/i });
    fireEvent.click(demoBtn);

    await waitFor(() => {
      expect(mockSignInGuest).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('renders celebration categories, how it works, and feature sections', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      loading: false,
    });

    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Crafted for Every Indian Celebration/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Wedding & Engagement$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Birthday$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Community Event$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /How Utsav Works/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Everything You Need for a Seamless Celebration/i })).toBeInTheDocument();
  });
});
