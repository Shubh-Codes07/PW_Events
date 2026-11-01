import { useState, useMemo } from 'react';
import { useEvent } from '../../context/EventContext';
import { formatINR, parseINR } from '../../lib/currency';
import { apiFetch } from '../../lib/api';
import {
  Button,
  useToast,
} from '../../components/ui';
import styles from './Vendors.module.css';
import VendorFormModal from './components/VendorFormModal';
import VendorEnquiryModal from './components/VendorEnquiryModal';

const VENDOR_STATUS_OPTIONS = [
  { value: 'to_contact', label: 'To Contact' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quote_received', label: 'Quote Received' },
  { value: 'booked', label: 'Booked' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi (हिंदी)' },
  { value: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
];

export default function Vendors() {
  const { eventId, categories, vendors, addVendor, updateVendor, deleteVendor } =
    useEvent();
  const { addToast } = useToast();

  // Add / Edit Vendor Modal
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorCategory, setVendorCategory] = useState('');
  const [vendorStatus, setVendorStatus] = useState('to_contact');
  const [vendorQuoteStr, setVendorQuoteStr] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorNotes, setVendorNotes] = useState('');
  const [isSavingVendor, setIsSavingVendor] = useState(false);

  // AI Enquiry Modal
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [selectedVendorForEnquiry, setSelectedVendorForEnquiry] = useState(null);
  const [enquiryLanguage, setEnquiryLanguage] = useState('en');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [isDraftingEnquiry, setIsDraftingEnquiry] = useState(false);

  // Group vendors by category
  const vendorsByCategory = useMemo(() => {
    const map = new Map();
    vendors.forEach((v) => {
      const cat = v.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(v);
    });
    return map;
  }, [vendors]);

  // Compare quotes/booked per category against planned budget
  const categoryQuotesComparison = useMemo(() => {
    const list = [];
    vendorsByCategory.forEach((catVendors, catName) => {
      const totalQuotes = catVendors.reduce(
        (sum, v) => sum + (Number(v.quote_amount) || 0),
        0,
      );
      const bookedCount = catVendors.filter((v) => v.status === 'booked').length;

      // Find matching budget category
      const matchedBudget = categories.find(
        (c) => c.name.toLowerCase().trim() === catName.toLowerCase().trim(),
      );
      const planned = matchedBudget ? Number(matchedBudget.planned_amount) : 0;
      const exceeds = planned > 0 && totalQuotes > planned;

      list.push({
        category: catName,
        totalQuotes,
        planned,
        bookedCount,
        exceeds,
        difference: totalQuotes - planned,
      });
    });
    return list;
  }, [vendorsByCategory, categories]);

  // Open Add Modal
  const openAddModal = (defaultCategory = '') => {
    setEditingVendor(null);
    setVendorName('');
    setVendorCategory(defaultCategory || categories[0]?.name || 'General');
    setVendorStatus('to_contact');
    setVendorQuoteStr('');
    setVendorPhone('');
    setVendorEmail('');
    setVendorNotes('');
    setVendorModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (vendor) => {
    setEditingVendor(vendor);
    setVendorName(vendor.name);
    setVendorCategory(vendor.category);
    setVendorStatus(vendor.status);
    setVendorQuoteStr(vendor.quote_amount ? vendor.quote_amount.toString() : '');
    setVendorPhone(vendor.phone || '');
    setVendorEmail(vendor.email || '');
    setVendorNotes(vendor.notes || '');
    setVendorModalOpen(true);
  };

  // Save Vendor
  const handleSaveVendor = async (e) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      addToast({ message: 'Vendor name is required.', type: 'warning' });
      return;
    }

    setIsSavingVendor(true);
    const payload = {
      name: vendorName.trim(),
      category: vendorCategory.trim() || 'General',
      status: vendorStatus,
      quote_amount: vendorQuoteStr ? parseINR(vendorQuoteStr) : null,
      phone: vendorPhone.trim() || null,
      email: vendorEmail.trim() || null,
      notes: vendorNotes.trim() || null,
    };

    try {
      if (editingVendor) {
        await updateVendor(editingVendor.id, payload);
        addToast({ message: 'Vendor details updated!', type: 'success' });
      } else {
        await addVendor(payload);
      }
      setVendorModalOpen(false);
    } catch (err) {
      addToast({ message: err.message || 'Failed to save vendor', type: 'error' });
    } finally {
      setIsSavingVendor(false);
    }
  };

  // Quick Status change from select
  const handleQuickStatusChange = async (vendorId, status) => {
    try {
      await updateVendor(vendorId, { status });
    } catch {
      addToast({ message: 'Failed to update vendor status', type: 'error' });
    }
  };

  // Open AI Enquiry Draft Modal
  const handleOpenEnquiryModal = async (vendor) => {
    setSelectedVendorForEnquiry(vendor);
    setEnquiryModalOpen(true);
    await fetchDraft(vendor, 'en');
  };

  const fetchDraft = async (vendor, lang) => {
    setIsDraftingEnquiry(true);
    try {
      const res = await apiFetch(`/events/${eventId}/vendors/${vendor.id}/enquiry`, {
        method: 'POST',
        body: JSON.stringify({ language: lang }),
      });
      setEnquiryMessage(res.data.message || '');
    } catch (err) {
      addToast({
        message: err.message || 'Could not draft message. Please try again.',
        type: 'error',
      });
    } finally {
      setIsDraftingEnquiry(false);
    }
  };

  const handleLanguageChange = (lang) => {
    setEnquiryLanguage(lang);
    if (selectedVendorForEnquiry) {
      fetchDraft(selectedVendorForEnquiry, lang);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(enquiryMessage);
    addToast({ message: 'Enquiry message copied to clipboard! 📋', type: 'success' });
  };

  // WhatsApp Link
  const whatsAppUrl = useMemo(() => {
    if (!enquiryMessage) return '#';
    const cleanPhone = (selectedVendorForEnquiry?.phone || '').replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(enquiryMessage);
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encoded}`;
    }
    return `https://wa.me/?text=${encoded}`;
  }, [enquiryMessage, selectedVendorForEnquiry]);

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Vendor Directory & Checklist</h1>
          <p className={styles.subtitle}>
            Organize suppliers, compare quotations with your budget, and draft multi-language enquiries.
          </p>
        </div>

        <Button variant="primary" onClick={() => openAddModal()}>
          + Add Vendor
        </Button>
      </div>

      {/* Category Quotes Comparison Bar */}
      {categoryQuotesComparison.length > 0 && (
        <div>
          <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
            Quote vs Budget Safeguard
          </h2>
          <div className={styles.categoryOverview}>
            {categoryQuotesComparison.map((item) => (
              <div key={item.category} className={styles.categoryCard}>
                <div className={styles.categoryCardHeader}>
                  <span className={styles.categoryCardTitle}>{item.category}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {item.bookedCount > 0 ? `✓ ${item.bookedCount} booked` : 'Pending booking'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                  <span>Total Quotes: <strong>{formatINR(item.totalQuotes)}</strong></span>
                  <span>Planned: <strong>{formatINR(item.planned)}</strong></span>
                </div>

                {item.exceeds && (
                  <div className={styles.categoryWarning} role="alert">
                    <span>⚠️</span>
                    <span>
                      Quotes exceed planned by <strong>{formatINR(item.difference)}</strong>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendors Grouped by Category */}
      {Array.from(vendorsByCategory.entries()).map(([catName, vList]) => (
        <section
          key={catName}
          className={styles.categorySection}
          aria-label={`${catName} vendors`}
        >
          <div className={styles.categoryHeading}>
            <span>
              🤝 {catName} ({vList.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openAddModal(catName)}
              aria-label={`Add vendor to ${catName}`}
            >
              + Add {catName}
            </Button>
          </div>

          <div className={styles.vendorGrid}>
            {vList.map((vendor) => (
              <div key={vendor.id} className={styles.vendorCard}>
                <div className={styles.vendorTop}>
                  <div>
                    <h3 className={styles.vendorName}>{vendor.name}</h3>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      Quote: <strong>{vendor.quote_amount ? formatINR(vendor.quote_amount) : 'Not quoted'}</strong>
                    </div>
                  </div>

                  <select
                    className={styles.vendorStatusSelect}
                    value={vendor.status}
                    onChange={(e) => handleQuickStatusChange(vendor.id, e.target.value)}
                    aria-label={`Status for ${vendor.name}`}
                  >
                    {VENDOR_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact info */}
                <div className={styles.vendorContactRow}>
                  {vendor.phone && (
                    <span>
                      📞 <a href={`tel:${vendor.phone}`}>{vendor.phone}</a>
                    </span>
                  )}
                  {vendor.email && (
                    <span>
                      ✉️ <a href={`mailto:${vendor.email}`}>{vendor.email}</a>
                    </span>
                  )}
                </div>

                {/* Notes */}
                {vendor.notes && <div className={styles.vendorNotes}>{vendor.notes}</div>}

                {/* Actions */}
                <div className={styles.vendorActions}>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleOpenEnquiryModal(vendor)}
                  >
                    💬 Draft Enquiry
                  </Button>

                  <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(vendor)}
                      aria-label={`Edit ${vendor.name}`}
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteVendor(vendor.id)}
                      aria-label={`Delete ${vendor.name}`}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {vendors.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
          No vendors added yet. Click &quot;+ Add Vendor&quot; above to begin tracking event partners!
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      <VendorFormModal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
        editingVendor={editingVendor}
        vendorName={vendorName}
        setVendorName={setVendorName}
        vendorCategory={vendorCategory}
        setVendorCategory={setVendorCategory}
        vendorStatus={vendorStatus}
        setVendorStatus={setVendorStatus}
        vendorQuoteStr={vendorQuoteStr}
        setVendorQuoteStr={setVendorQuoteStr}
        vendorPhone={vendorPhone}
        setVendorPhone={setVendorPhone}
        vendorEmail={vendorEmail}
        setVendorEmail={setVendorEmail}
        vendorNotes={vendorNotes}
        setVendorNotes={setVendorNotes}
        statusOptions={VENDOR_STATUS_OPTIONS}
        onSaveVendor={handleSaveVendor}
        isSavingVendor={isSavingVendor}
      />

      {/* AI Vendor Enquiry Modal */}
      <VendorEnquiryModal
        isOpen={enquiryModalOpen}
        onClose={() => setEnquiryModalOpen(false)}
        selectedVendor={selectedVendorForEnquiry}
        enquiryLanguage={enquiryLanguage}
        enquiryMessage={enquiryMessage}
        isDraftingEnquiry={isDraftingEnquiry}
        languageOptions={LANGUAGE_OPTIONS}
        whatsAppUrl={whatsAppUrl}
        onLanguageChange={handleLanguageChange}
        onCopyMessage={handleCopyMessage}
      />
    </div>
  );
}
