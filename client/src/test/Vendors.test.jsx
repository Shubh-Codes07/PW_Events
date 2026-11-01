import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Vendors from '../pages/dashboard/Vendors';
import * as EventContextModule from '../context/EventContext';
import * as ApiModule from '../lib/api';
import { ToastProvider } from '../components/ui';

describe('Vendors Page Component', () => {
  const mockAddVendor = vi.fn();
  const mockUpdateVendor = vi.fn();
  const mockDeleteVendor = vi.fn();

  const mockVendors = [
    {
      id: 'ven-1',
      name: 'Royal Heritage Caterers',
      category: 'Catering',
      status: 'to_contact',
      quote_amount: 150000,
      phone: '+91 9876543210',
      email: 'cater@royal.com',
      notes: 'South Indian & North Indian live counters',
    },
    {
      id: 'ven-2',
      name: 'ShutterShine Photography',
      category: 'Photography',
      status: 'booked',
      quote_amount: 80000,
      phone: '+91 9876543211',
      email: 'photos@shutter.com',
      notes: 'Traditional album included',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockAddVendor.mockReset();
    mockUpdateVendor.mockReset();
    mockDeleteVendor.mockReset();

    vi.spyOn(EventContextModule, 'useEvent').mockReturnValue({
      eventId: 'test-event-id',
      categories: [{ id: 'cat-1', name: 'Catering' }, { id: 'cat-2', name: 'Photography' }],
      vendors: mockVendors,
      addVendor: mockAddVendor,
      updateVendor: mockUpdateVendor,
      deleteVendor: mockDeleteVendor,
    });
  });

  it('renders vendors grouped by category with details', () => {
    render(
      <ToastProvider>
        <Vendors />
      </ToastProvider>,
    );

    expect(screen.getByText('Royal Heritage Caterers')).toBeInTheDocument();
    expect(screen.getByText('ShutterShine Photography')).toBeInTheDocument();
    expect(screen.getAllByText(/1,50,000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/80,000/).length).toBeGreaterThanOrEqual(1);
  });

  it('opens add vendor modal and submits new vendor', async () => {
    mockAddVendor.mockResolvedValue({ id: 'ven-3', name: 'DJ Soundwaves' });

    render(
      <ToastProvider>
        <Vendors />
      </ToastProvider>,
    );

    const addBtn = screen.getByRole('button', { name: /\+ Add Vendor/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('heading', { name: /Add New Vendor/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Vendor \/ Business Name \*/i);
    fireEvent.change(nameInput, { target: { value: 'DJ Soundwaves' } });

    const saveBtn = screen.getByRole('button', { name: /Save Vendor/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockAddVendor).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'DJ Soundwaves',
        }),
      );
    });
  });

  it('changes vendor booking status directly from select dropdown', async () => {
    mockUpdateVendor.mockResolvedValue({});

    render(
      <ToastProvider>
        <Vendors />
      </ToastProvider>,
    );

    const select = screen.getByLabelText(/Status for Royal Heritage Caterers/i);
    fireEvent.change(select, { target: { value: 'booked' } });

    await waitFor(() => {
      expect(mockUpdateVendor).toHaveBeenCalledWith('ven-1', { status: 'booked' });
    });
  });

  it('opens AI enquiry draft modal and displays drafted message with WhatsApp link', async () => {
    vi.spyOn(ApiModule, 'apiFetch').mockResolvedValue({
      data: {
        message: 'Namaste Royal Heritage Caterers, we are planning a celebration and would like to request a quote.',
      },
    });

    render(
      <ToastProvider>
        <Vendors />
      </ToastProvider>,
    );

    const draftBtns = screen.getAllByRole('button', { name: /Draft Enquiry/i });
    fireEvent.click(draftBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Namaste Royal Heritage Caterers/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Open in WhatsApp/i })).toBeInTheDocument();
    });
  });
});
