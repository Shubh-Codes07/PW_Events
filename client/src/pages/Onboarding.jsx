import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  createEventSchema,
  EVENT_VIBES,
} from '@shared/eventSchemas';
import { Button, Input, ProgressBar, Skeleton, useToast } from '../components/ui';
import { formatINR, parseINR } from '../lib/currency';
import { apiFetch } from '../lib/api';
import styles from './Onboarding.module.css';

const SPECIAL_NEEDS_OPTIONS = [
  { id: 'vegetarian_only', label: '🥗 Vegetarian Only' },
  { id: 'kids_friendly', label: '🎈 Kids Friendly' },
  { id: 'elderly_guests', label: '👵 Elderly Guests Comfort' },
  { id: 'accessibility_needs', label: '♿ Wheelchair / Accessibility' },
  { id: 'outdoor', label: '🌳 Outdoor Space' },
  { id: 'indoor', label: '🏛️ AC Indoor Hall' },
];

const EVENT_TYPE_OPTIONS = [
  {
    type: 'wedding',
    title: 'Wedding / Engagement',
    desc: 'Ceremonies, sangeet, reception & traditions',
    icon: '💍',
  },
  {
    type: 'birthday',
    title: 'Birthday Celebration',
    desc: 'Theme, cake, games, decor & music',
    icon: '🎂',
  },
  {
    type: 'community',
    title: 'Community / Campus',
    desc: 'Festivals, gatherings, alumni & cultural meetups',
    icon: '🎉',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    event_date: '',
    city: '',
    guest_count: 100,
    budget_total: 200000,
    vibe: 'Traditional',
    special_needs: {
      tags: [],
      notes: '',
    },
  });

  const [rawBudgetInput, setRawBudgetInput] = useState('2,00,000');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 5; // 4 input steps + 1 review step
  const progressPercent = useMemo(
    () => ((currentStep - 1) / (totalSteps - 1)) * 100,
    [currentStep, totalSteps],
  );

  const validateStep = (stepNumber) => {
    let result;
    setErrors({});

    if (stepNumber === 1) {
      result = step1Schema.safeParse({ type: formData.type, name: formData.name });
    } else if (stepNumber === 2) {
      result = step2Schema.safeParse({
        event_date: formData.event_date,
        city: formData.city,
        guest_count: formData.guest_count,
      });
    } else if (stepNumber === 3) {
      result = step3Schema.safeParse({
        budget_total: formData.budget_total,
        vibe: formData.vibe,
      });
    } else if (stepNumber === 4) {
      result = step4Schema.safeParse({ special_needs: formData.special_needs });
    } else {
      result = createEventSchema.safeParse(formData);
    }

    if (!result.success) {
      const stepErrors = {};
      result.error.issues.forEach((issue) => {
        const fieldName = issue.path[issue.path.length - 1];
        stepErrors[fieldName] = issue.message;
      });
      setErrors(stepErrors);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleBudgetChange = (e) => {
    const val = e.target.value;
    setRawBudgetInput(val);
    const parsed = parseINR(val);
    setFormData((prev) => ({ ...prev, budget_total: parsed }));
  };

  const handleTagToggle = (tagId) => {
    setFormData((prev) => {
      const currentTags = prev.special_needs.tags || [];
      const updatedTags = currentTags.includes(tagId)
        ? currentTags.filter((t) => t !== tagId)
        : [...currentTags, tagId];
      return {
        ...prev,
        special_needs: { ...prev.special_needs, tags: updatedTags },
      };
    });
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    try {
      const createdEvent = await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      addToast({
        message: '🎊 Celebration planned successfully with AI!',
        type: 'success',
      });

      navigate('/dashboard', {
        state: { newEventId: createdEvent?.data?.event?.id },
      });
    } catch (err) {
      addToast({
        message: err.message || 'Failed to create event. Please try again.',
        type: 'error',
      });
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <div className={styles.container}>
        <div className={styles.wizardCard}>
          <div className={styles.loadingContainer} aria-live="polite">
            <span style={{ fontSize: '3.5rem' }}>✨</span>
            <h2 className={styles.loadingTitle}>Planning your celebration...</h2>
            <p className={styles.loadingSubtitle}>
              Utsav AI is crafting your personalized budget breakdown, milestone timeline,
              and vendor checklist.
            </p>
            <div style={{ width: '100%', maxWidth: '480px', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Skeleton variant="card" height="90px" />
              <Skeleton variant="card" height="90px" />
              <Skeleton variant="text" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wizardCard}>
        {/* Progress Bar & Step Header */}
        <div className={styles.header}>
          <div className={styles.stepIndicator}>
            Step {currentStep} of {totalSteps}: {
              currentStep === 1 ? 'Event Type & Name' :
              currentStep === 2 ? 'Date & Location' :
              currentStep === 3 ? 'Budget & Vibe' :
              currentStep === 4 ? 'Preferences' : 'Review & Confirm'
            }
          </div>
          <h1 className={styles.title}>
            {currentStep === 1 && 'What are we celebrating?'}
            {currentStep === 2 && 'When and where?'}
            {currentStep === 3 && 'Budget and aesthetic'}
            {currentStep === 4 && 'Special needs & requests'}
            {currentStep === 5 && 'Review your event details'}
          </h1>
          <p className={styles.description}>
            {currentStep === 1 && 'Choose the type of celebration and give it a memorable title.'}
            {currentStep === 2 && 'Helps our AI establish seasonal availability and capacity.'}
            {currentStep === 3 && 'We tailor budget splits using realistic Indian market pricing.'}
            {currentStep === 4 && 'Dietary, accessibility, or venue requirements for guests.'}
            {currentStep === 5 && 'Verify details before our AI generates your master event plan.'}
          </p>
        </div>

        <div className={styles.progressWrapper}>
          <ProgressBar
            value={progressPercent}
            label={`Onboarding progress (${currentStep}/${totalSteps})`}
            showPercent={false}
            color="accent"
          />
        </div>

        {/* Step 1: Type & Name */}
        {currentStep === 1 && (
          <div className={styles.formSection}>
            <div>
              <label className={styles.reviewLabel}>Select Event Type *</label>
              <div className={styles.typeGrid} role="radiogroup" aria-label="Event Type">
                {EVENT_TYPE_OPTIONS.map((opt) => {
                  const isSelected = formData.type === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`${styles.typeCard} ${isSelected ? styles['typeCard--selected'] : ''}`}
                      onClick={() => {
                        setFormData((p) => ({ ...p, type: opt.type }));
                        if (errors.type) setErrors((e) => ({ ...e, type: null }));
                      }}
                    >
                      <span className={styles.typeIcon} aria-hidden="true">{opt.icon}</span>
                      <span className={styles.typeName}>{opt.title}</span>
                      <span className={styles.typeDesc}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
              {errors.type && <span className={styles.budgetPreview} style={{ color: 'var(--color-danger)' }}>{errors.type}</span>}
            </div>

            <Input
              id="event-name"
              label="Event Name *"
              placeholder="e.g. Priya & Rahul's Wedding, Aarav's 5th Birthday"
              value={formData.name}
              error={errors.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
        )}

        {/* Step 2: Date, City, Guests */}
        {currentStep === 2 && (
          <div className={styles.formSection}>
            <Input
              type="date"
              id="event-date"
              label="Event Date *"
              value={formData.event_date}
              error={errors.event_date}
              onChange={(e) => setFormData((p) => ({ ...p, event_date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              required
            />

            <Input
              id="event-city"
              label="City / Destination *"
              placeholder="e.g. Jaipur, Bengaluru, Delhi NCR"
              value={formData.city}
              error={errors.city}
              onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
              required
            />

            <Input
              type="number"
              id="guest-count"
              label="Estimated Guest Count *"
              value={formData.guest_count}
              error={errors.guest_count}
              onChange={(e) => setFormData((p) => ({ ...p, guest_count: parseInt(e.target.value, 10) || 0 }))}
              min={1}
              max={10000}
              required
            />
          </div>
        )}

        {/* Step 3: Budget & Vibe */}
        {currentStep === 3 && (
          <div className={styles.formSection}>
            <div>
              <Input
                id="event-budget"
                label="Total Estimated Budget (₹) *"
                value={rawBudgetInput}
                error={errors.budget_total}
                onChange={handleBudgetChange}
                placeholder="e.g. 5,00,000"
                hint="Use commas for Indian grouping (e.g. 2,50,000)"
                required
              />
              <div className={styles.budgetPreview}>
                Live Preview: {formatINR(formData.budget_total)}
              </div>
            </div>

            <div>
              <label className={styles.reviewLabel}>Event Vibe & Aesthetic *</label>
              <div className={styles.vibeGrid} role="radiogroup" aria-label="Event Vibe">
                {EVENT_VIBES.map((v) => {
                  const isSelected = formData.vibe === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`${styles.vibeChip} ${isSelected ? styles['vibeChip--selected'] : ''}`}
                      onClick={() => setFormData((p) => ({ ...p, vibe: v }))}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
              {errors.vibe && <span className={styles.budgetPreview} style={{ color: 'var(--color-danger)' }}>{errors.vibe}</span>}
            </div>
          </div>
        )}

        {/* Step 4: Special Needs */}
        {currentStep === 4 && (
          <div className={styles.formSection}>
            <div>
              <label className={styles.reviewLabel}>Special Accommodations</label>
              <div className={styles.checkboxGrid}>
                {SPECIAL_NEEDS_OPTIONS.map((opt) => {
                  const isChecked = formData.special_needs?.tags?.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className={`${styles.checkboxItem} ${isChecked ? styles['checkboxItem--checked'] : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTagToggle(opt.id)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <Input
              multiline
              id="special-notes"
              label="Additional Notes / Cultural Specifics (optional, max 300 chars)"
              placeholder="e.g., South Indian vegetarian catering required, haldi by poolside, baraat permit needed."
              value={formData.special_needs.notes}
              maxLength={300}
              error={errors.notes}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  special_needs: { ...p.special_needs, notes: e.target.value },
                }))
              }
              hint={`${formData.special_needs.notes?.length || 0}/300 characters`}
            />
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className={styles.formSection}>
            <div className={styles.reviewGrid}>
              <div className={styles.reviewItem}>
                <div className={styles.reviewLabel}>Celebration Type</div>
                <div className={styles.reviewValue} style={{ textTransform: 'capitalize' }}>
                  {formData.type}
                </div>
              </div>
              <div className={styles.reviewItem}>
                <div className={styles.reviewLabel}>Event Name</div>
                <div className={styles.reviewValue}>{formData.name}</div>
              </div>
              <div className={styles.reviewItem}>
                <div className={styles.reviewLabel}>Target Date</div>
                <div className={styles.reviewValue}>{formData.event_date}</div>
              </div>
              <div className={styles.reviewItem}>
                <div className={styles.reviewLabel}>Location</div>
                <div className={styles.reviewValue}>{formData.city}</div>
              </div>
              <div className={styles.reviewItem}>
                <div className={styles.reviewLabel}>Guest Count</div>
                <div className={styles.reviewValue}>{formData.guest_count} guests</div>
              </div>
              <div className={styles.reviewItem}>
                <div className={styles.reviewLabel}>Total Budget</div>
                <div className={styles.reviewValue} style={{ color: 'var(--color-primary)' }}>
                  {formatINR(formData.budget_total)}
                </div>
              </div>
              <div className={styles.reviewItem}>
                <div className={styles.reviewLabel}>Aesthetic / Vibe</div>
                <div className={styles.reviewValue}>{formData.vibe}</div>
              </div>
              <div className={styles.reviewItem}>
                <div className={styles.reviewLabel}>Accommodations</div>
                <div className={styles.reviewValue}>
                  {formData.special_needs.tags.length > 0
                    ? `${formData.special_needs.tags.length} selected`
                    : 'None specified'}
                </div>
              </div>
            </div>

            {formData.special_needs.notes && (
              <div className={styles.reviewItem}>
                <div className={styles.reviewLabel}>Special Notes</div>
                <div className={styles.reviewValue} style={{ fontWeight: 'normal', fontSize: 'var(--text-sm)' }}>
                  {formData.special_needs.notes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Actions */}
        <div className={styles.actions}>
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handleBack} type="button">
              ← Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <Button variant="primary" onClick={handleNext} type="button">
              Next Step →
            </Button>
          ) : (
            <Button variant="accent" size="lg" onClick={handleSubmit} type="button">
              Generate AI Event Plan 🚀
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
