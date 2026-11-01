import { useState, useMemo } from 'react';
import { useEvent } from '../../context/EventContext';
import { Button, Skeleton } from '../../components/ui';
import { formatINR } from '../../lib/currency';
import styles from './Ideas.module.css';

const IDEA_KINDS = [
  { id: 'theme', label: '🎨 Themes' },
  { id: 'decor', label: '🌸 Decor & Stage' },
  { id: 'menu', label: '🍲 Menu & Catering' },
  { id: 'game', label: '🎲 Games & Activities' },
  { id: 'gift', label: '🎁 Return Gifts & Favors' },
  { id: 'invitation', label: '💌 Invitation Wording' },
];

const REFINE_PRESETS = [
  { label: '💰 Make it cheaper', value: 'Make it cheaper' },
  { label: '🪔 More traditional', value: 'More traditional' },
  { label: '🎉 More fun', value: 'More fun' },
];

export default function Ideas() {
  const { ideas, generateIdeas, toggleSaveIdea, deleteIdea } = useEvent();

  const [selectedKind, setSelectedKind] = useState('theme');
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter ideas by current kind and sort saved first
  const currentIdeas = useMemo(() => {
    return ideas
      .filter((i) => i.kind === selectedKind)
      .sort((a, b) => (b.saved === a.saved ? 0 : b.saved ? 1 : -1));
  }, [ideas, selectedKind]);

  const handleGenerate = async (refine = '') => {
    setIsGenerating(true);
    try {
      await generateIdeas(selectedKind, refine);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>AI Inspiration & Ideas Studio</h1>
          <p className={styles.subtitle}>
            Explore tailored concepts for decor, menus, rituals, and gifts matched to your budget and vibe.
          </p>
        </div>

        <Button
          variant="accent"
          onClick={() => handleGenerate()}
          disabled={isGenerating}
          aria-label={`Generate new ${selectedKind} ideas`}
        >
          {isGenerating ? 'Generating...' : `✨ Generate ${selectedKind.toUpperCase()} Ideas`}
        </Button>
      </div>

      {/* Category Tabs / Chips */}
      <div className={styles.kindsRow} role="tablist" aria-label="Idea Categories">
        {IDEA_KINDS.map((k) => (
          <button
            key={k.id}
            role="tab"
            aria-selected={selectedKind === k.id}
            className={`${styles.kindChip} ${selectedKind === k.id ? styles['kindChip--active'] : ''}`}
            onClick={() => setSelectedKind(k.id)}
            type="button"
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Refine Actions Bar */}
      <div className={styles.refineBar}>
        <span className={styles.refineLabel}>Refine with AI:</span>
        <div className={styles.refineButtons}>
          {REFINE_PRESETS.map((p) => (
            <Button
              key={p.value}
              variant="outline"
              size="sm"
              onClick={() => handleGenerate(p.value)}
              disabled={isGenerating}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Ideas Grid */}
      {isGenerating ? (
        <div className={styles.ideasGrid} aria-busy="true" aria-label="Loading new ideas">
          <Skeleton variant="card" height="180px" />
          <Skeleton variant="card" height="180px" />
          <Skeleton variant="card" height="180px" />
        </div>
      ) : currentIdeas.length > 0 ? (
        <div className={styles.ideasGrid} role="region" aria-label={`${selectedKind} ideas list`}>
          {currentIdeas.map((idea) => (
            <div
              key={idea.id}
              className={`${styles.ideaCard} ${idea.saved ? styles['ideaCard--saved'] : ''}`}
            >
              <div className={styles.ideaTop}>
                <h3 className={styles.ideaTitle}>{idea.title}</h3>
                <button
                  type="button"
                  className={`${styles.saveButton} ${idea.saved ? styles['saveButton--saved'] : ''}`}
                  onClick={() => toggleSaveIdea(idea.id, idea.saved)}
                  aria-label={idea.saved ? `Remove ${idea.title} from saved ideas` : `Save ${idea.title}`}
                  title={idea.saved ? 'Remove from favorites' : 'Save to favorites'}
                >
                  {idea.saved ? '⭐' : '☆'}
                </button>
              </div>

              <div className={styles.ideaBody}>{idea.body}</div>

              <div className={styles.ideaFooter}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={styles.kindBadge}>{idea.kind}</span>
                  {idea.estimated_cost_inr ? (
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--weight-semibold)',
                        color: 'var(--color-primary)',
                        background: 'var(--color-bg-alt)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      💰 Est. {formatINR(idea.estimated_cost_inr)}
                    </span>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteIdea(idea.id)}
                  aria-label={`Delete idea ${idea.title}`}
                >
                  🗑️ Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            💡
          </span>
          <h3>No {selectedKind} ideas generated yet</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', maxWidth: '420px' }}>
            Click &quot;Generate Ideas&quot; above to have Utsav AI curate 4–6 personalized concepts tailored specifically to your event budget and vibe.
          </p>
          <Button variant="primary" onClick={() => handleGenerate()} disabled={isGenerating}>
            ✨ Generate First Batch
          </Button>
        </div>
      )}
    </div>
  );
}
