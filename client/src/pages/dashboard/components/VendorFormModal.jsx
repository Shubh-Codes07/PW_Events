import { Button, Input, Modal, Select } from '../../../components/ui';
import styles from '../Vendors.module.css';

export default function VendorFormModal({
  isOpen,
  onClose,
  editingVendor,
  vendorName,
  setVendorName,
  vendorCategory,
  setVendorCategory,
  vendorStatus,
  setVendorStatus,
  vendorQuoteStr,
  setVendorQuoteStr,
  vendorPhone,
  setVendorPhone,
  vendorEmail,
  setVendorEmail,
  vendorNotes,
  setVendorNotes,
  statusOptions,
  onSaveVendor,
  isSavingVendor,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingVendor ? 'Edit Vendor Details' : 'Add New Vendor'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSaveVendor} disabled={isSavingVendor}>
            {isSavingVendor ? 'Saving...' : 'Save Vendor'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSaveVendor} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className={styles.formGrid}>
          <Input
            label="Vendor / Business Name *"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            required
          />
          <Input
            label="Category *"
            value={vendorCategory}
            onChange={(e) => setVendorCategory(e.target.value)}
            placeholder="e.g. Catering, Photography"
            required
          />
        </div>

        <div className={styles.formGrid}>
          <Select
            label="Booking Status"
            options={statusOptions}
            value={vendorStatus}
            onChange={(e) => setVendorStatus(e.target.value)}
          />
          <Input
            label="Quotation Amount (₹)"
            placeholder="e.g. 75,000"
            value={vendorQuoteStr}
            onChange={(e) => setVendorQuoteStr(e.target.value)}
          />
        </div>

        <div className={styles.formGrid}>
          <Input
            label="Phone Number"
            placeholder="+91 9876543210"
            value={vendorPhone}
            onChange={(e) => setVendorPhone(e.target.value)}
          />
          <Input
            type="email"
            label="Email Address"
            placeholder="vendor@example.com"
            value={vendorEmail}
            onChange={(e) => setVendorEmail(e.target.value)}
          />
        </div>

        <Input
          multiline
          label="Notes & Package Deliverables"
          placeholder="e.g. Includes drone shoot, album, 2 videographers."
          value={vendorNotes}
          onChange={(e) => setVendorNotes(e.target.value)}
        />
      </form>
    </Modal>
  );
}

