import { Button, Modal } from '../../../components/ui';
import styles from '../Vendors.module.css';

export default function VendorEnquiryModal({
  isOpen,
  onClose,
  selectedVendor,
  enquiryLanguage,
  enquiryMessage,
  isDraftingEnquiry,
  languageOptions,
  whatsAppUrl,
  onLanguageChange,
  onCopyMessage,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Draft Enquiry for ${selectedVendor?.name || 'Vendor'}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={onCopyMessage} disabled={!enquiryMessage}>
            📋 Copy Message
          </Button>
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Button variant="accent">
              📲 Open in WhatsApp →
            </Button>
          </a>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Choose language for personalized AI draft:
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            {languageOptions.map((lang) => (
              <Button
                key={lang.value}
                variant={enquiryLanguage === lang.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onLanguageChange(lang.value)}
                disabled={isDraftingEnquiry}
              >
                {lang.label}
              </Button>
            ))}
          </div>
        </div>

        {isDraftingEnquiry ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            ✨ Crafting polite cultural enquiry with Gemini...
          </div>
        ) : (
          <div className={styles.enquiryBox}>{enquiryMessage}</div>
        )}

        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          💡 You can edit or personalize this text in WhatsApp or your email app before sending.
        </div>
      </div>
    </Modal>
  );
}

