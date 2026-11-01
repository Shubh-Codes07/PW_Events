import { useState, useRef, useEffect, useCallback } from 'react';
import { useEvent } from '../../context/EventContext';
import { apiFetch } from '../../lib/api';
import { Button } from '../ui';
import styles from './FloatingAssistant.module.css';

const STARTER_QUESTIONS = [
  'Can I stay within my planned budget?',
  'What should I book or finalize first?',
  'Suggest a culturally appropriate menu plan',
];

export default function FloatingAssistant() {
  const { eventId, event } = useEvent();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Namaste! I am your Utsav Planning Assistant. How can I help you organize ${event?.name || 'your celebration'} today?`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to latest message
  useEffect(() => {
    if (isOpen && typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Accessibility: Focus management and Esc key handling
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Move focus into input when opened
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Send message
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || text.length > 500 || isSending) return;

    const userEntry = { role: 'user', content: text };
    const nextMessages = [...messages, userEntry];
    setMessages(nextMessages);
    setInputMessage('');
    setIsSending(true);

    try {
      // Build history of up to last 6 turns (excluding initial welcome)
      const history = nextMessages
        .slice(1, -1)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await apiFetch(`/events/${eventId}/assistant`, {
        method: 'POST',
        body: JSON.stringify({ message: text, history }),
      });

      const reply = res.data?.reply || 'I am ready to help with your event planning!';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I had trouble connecting to the planning server. Please check your network or try again in a moment.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        ref={triggerRef}
        type="button"
        className={styles.fab}
        onClick={isOpen ? handleClose : handleOpen}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open Utsav AI Planning Assistant'}
        aria-expanded={isOpen}
      >
        <span aria-hidden="true">{isOpen ? '×' : '🤖'}</span>
        {!isOpen && <span className={styles.fabBadge} aria-hidden="true" />}
      </button>

      {/* Floating Assistant Chat Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-modal="false"
          aria-label="Utsav AI Assistant"
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <span>✨</span>
              <span>Utsav AI Assistant</span>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Close assistant panel"
            >
              ×
            </button>
          </div>

          {/* Messages Log (aria-live region) */}
          <div
            className={styles.messagesContainer}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`${styles.messageBubble} ${
                  m.role === 'user'
                    ? styles['messageBubble--user']
                    : styles['messageBubble--assistant']
                }`}
              >
                {m.content}
              </div>
            ))}

            {isSending && (
              <div
                className={`${styles.messageBubble} ${styles['messageBubble--assistant']}`}
                aria-busy="true"
              >
                <em>Consulting event knowledge & Gemini...</em>
              </div>
            )}

            {/* Starter Prompts (shown when conversation is new) */}
            {messages.length <= 2 && !isSending && (
              <div className={styles.startersSection}>
                <div className={styles.startersTitle}>Suggested questions:</div>
                {STARTER_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={styles.starterButton}
                    onClick={() => handleSendMessage(q)}
                  >
                    💡 {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form className={styles.inputForm} onSubmit={handleSubmit}>
            <div className={styles.inputRow}>
              <label htmlFor="assistant-input-field" className="visually-hidden">
                Ask a celebration planning question
              </label>
              <input
                ref={inputRef}
                id="assistant-input-field"
                type="text"
                className={styles.textInput}
                placeholder="Ask about budget, timeline, vendors..."
                value={inputMessage}
                maxLength={500}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isSending}
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!inputMessage.trim() || isSending}
              >
                Send
              </Button>
            </div>
            <div className={styles.charCount}>
              {inputMessage.length}/500 characters
            </div>
          </form>
        </div>
      )}
    </>
  );
}
