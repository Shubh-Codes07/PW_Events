import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvent } from '../../context/EventContext';
import { formatINR } from '../../lib/currency';
import { getCountdown } from '../../lib/dashboardUtils';
import { Card, Button, ProgressBar, Modal, useToast } from '../../components/ui';
import DonutChart from '../../components/charts/DonutChart';
import styles from './Overview.module.css';

export default function Overview() {
  const {
    eventId,
    event,
    tasks,
    totalBudget,
    totalSpent,
    totalRemaining,
    taskStats,
    nextBestAction,
    updateTask,
    regenerateShareToken,
  } = useEvent();

  const { addToast } = useToast();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRotatingToken, setIsRotatingToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const countdown = useMemo(() => getCountdown(event?.event_date), [event?.event_date]);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done')
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      })
      .slice(0, 3);
  }, [tasks]);

  // Donut chart slices for Budget summary
  const budgetSlices = useMemo(() => {
    const spentSlice = {
      label: 'Spent',
      value: totalSpent,
      color: 'var(--color-primary)',
    };
    const remainingSlice = {
      label: 'Remaining',
      value: Math.max(0, totalRemaining),
      color: 'var(--color-accent)',
    };
    return [spentSlice, remainingSlice];
  }, [totalSpent, totalRemaining]);

  const handleMarkActionDone = async () => {
    if (!nextBestAction) return;
    await updateTask(nextBestAction.id, { status: 'done' });
  };

  const formattedDate = event?.event_date
    ? new Date(event.event_date).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Date not set';

  const shareUrl = event?.share_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/plan/${event.share_token}`
    : '';

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopied(true);
      addToast({ message: 'Share link copied to clipboard!', type: 'success' });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      addToast({ message: 'Failed to copy link. Please copy manually.', type: 'error' });
    }
  };

  const handleRegenerate = async () => {
    if (
      !window.confirm(
        'Regenerating will invalidate the previous share link immediately. Continue?',
      )
    ) {
      return;
    }
    setIsRotatingToken(true);
    try {
      await regenerateShareToken();
    } finally {
      setIsRotatingToken(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Event Header Banner */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>{event?.name || 'Celebration Overview'}</h1>
          <div className={styles.metaRow}>
            <span className={styles.pill}>
              🎉 {event?.type ? event.type.toUpperCase() : 'EVENT'}
            </span>
            <span className={styles.pill}>📍 {event?.city || 'Location TBA'}</span>
            <span className={styles.pill}>👥 {event?.guest_count || 0} Guests</span>
            <span className={styles.pill}>📅 {formattedDate}</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShareModalOpen(true)}
            aria-label="Share read-only plan with helpers and guests"
          >
            🔗 Share Plan
          </Button>

          <div className={styles.countdownBadge} aria-label={`Countdown: ${countdown.text}`}>
            <div className={styles.countdownDays}>
              {countdown.state === 'today'
                ? '🎉'
                : countdown.state === 'passed'
                ? '✓'
                : countdown.days}
            </div>
            <div className={styles.countdownLabel}>
              {countdown.state === 'today'
                ? 'Celebration Day!'
                : countdown.state === 'passed'
                ? 'Event Concluded'
                : 'Days Remaining'}
            </div>
          </div>
        </div>
      </div>

      {/* Share Plan Accessible Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Celebration Plan"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <Button variant="ghost" onClick={() => setIsShareModalOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
            Anyone with this link can view a clean, read-only summary of the event details,
            milestones, and confirmed vendors.
          </p>

          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-bg-alt)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--color-success)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text)',
            }}
          >
            🔒 <strong>Strict Privacy Guard:</strong> Budget figures, expenses, vendor quote amounts,
            phone numbers, personal notes, and host credentials are <em>never</em> shared.
          </div>

          <div>
            <label
              htmlFor="share-plan-link-input"
              style={{
                display: 'block',
                fontWeight: 'var(--weight-semibold)',
                fontSize: 'var(--text-xs)',
                marginBottom: 'var(--space-2)',
                color: 'var(--color-text)',
              }}
            >
              Public Read-Only Link
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                id="share-plan-link-input"
                type="text"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                style={{
                  flex: 1,
                  padding: 'var(--space-2) var(--space-3)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'monospace',
                }}
              />
              <Button variant="primary" size="sm" onClick={handleCopyLink}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </Button>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', maxWidth: '320px' }}>
              Want to revoke public access? Rotating the token immediately breaks the previous link.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRotatingToken}
            >
              {isRotatingToken ? 'Rotating...' : '🔄 Rotate Link'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Next Best Action Card (Deterministic Urgent Task) */}
      {nextBestAction && (
        <div className={styles.actionCard} role="region" aria-label="Next Best Action">
          <div className={styles.actionTag}>⚡ Next Best Action</div>
          <div className={styles.actionTitle}>{nextBestAction.title}</div>
          <div className={styles.actionMeta}>
            <span>Category: <strong>{nextBestAction.category || 'General'}</strong></span>
            {nextBestAction.due_date && (
              <span>Target: <strong>{new Date(nextBestAction.due_date).toLocaleDateString('en-IN')}</strong></span>
            )}
          </div>
          <div>
            <Button variant="accent" size="sm" onClick={handleMarkActionDone}>
              ✓ Mark Complete
            </Button>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className={styles.grid}>
        {/* Budget Summary Card */}
        <Card>
          <div className={styles.sectionTitle}>
            <span>💰 Budget Overview</span>
            <Link to={`/dashboard/${eventId}/budget`}>
              <Button variant="ghost" size="sm">Manage →</Button>
            </Link>
          </div>

          <DonutChart
            slices={budgetSlices}
            centerLabel="Total Budget"
            centerValue={formatINR(totalBudget)}
            title="Budget Utilization Summary"
            showTable={false}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 'var(--space-4)',
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--color-border)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                Total Spent
              </div>
              <strong>{formatINR(totalSpent)}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                {totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}
              </div>
              <strong style={{ color: totalRemaining < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {formatINR(Math.abs(totalRemaining))}
              </strong>
            </div>
          </div>
        </Card>

        {/* Task Progress & Upcoming */}
        <Card>
          <div className={styles.sectionTitle}>
            <span>📅 Timeline & Tasks</span>
            <Link to={`/dashboard/${eventId}/timeline`}>
              <Button variant="ghost" size="sm">View All →</Button>
            </Link>
          </div>

          <ProgressBar
            value={taskStats.percentage}
            label={`${taskStats.done} of ${taskStats.total} milestones completed`}
            showPercent={true}
            color={taskStats.percentage === 100 ? 'success' : 'primary'}
          />

          <div className={styles.taskList}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              Next Up
            </div>
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((t) => (
                <div key={t.id} className={styles.taskItem}>
                  <span className={styles.taskTitle}>{t.title}</span>
                  <span className={styles.taskDue}>
                    {t.due_date
                      ? new Date(t.due_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : 'No date'}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                No pending tasks! All caught up.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
