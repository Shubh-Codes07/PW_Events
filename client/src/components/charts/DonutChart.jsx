import { useId } from 'react';
import { formatINR } from '../../lib/currency';
import styles from './DonutChart.module.css';

/**
 * Accessible SVG Donut Chart with screen-reader data table and legend.
 *
 * @param {Array<{ label: string, value: number, color: string }>} slices
 * @param {string} centerLabel
 * @param {string} centerValue
 * @param {boolean} [showTable=false]
 */
export default function DonutChart({
  slices = [],
  centerLabel = 'Spent',
  centerValue,
  showTable = false,
  title = 'Budget breakdown chart',
}) {
  const chartId = useId();
  const size = 200;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const totalValue = slices.reduce((acc, s) => acc + (Number(s.value) || 0), 0);

  const { renderedSlices } = slices.reduce(
    (acc, slice) => {
      const val = Number(slice.value) || 0;
      const percent = totalValue > 0 ? val / totalValue : 0;
      acc.renderedSlices.push({
        ...slice,
        percent: Math.round(percent * 100),
        strokeDasharray: `${percent * circumference} ${circumference}`,
        strokeDashoffset: -acc.accumulatedPercent * circumference,
      });
      acc.accumulatedPercent += percent;
      return acc;
    },
    { accumulatedPercent: 0, renderedSlices: [] },
  );

  return (
    <div className={styles.container}>
      <div className={styles.chartWrapper}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-labelledby={`${chartId}-title ${chartId}-desc`}
        >
          <title id={`${chartId}-title`}>{title}</title>
          <desc id={`${chartId}-desc`}>
            {slices.map((s) => `${s.label}: ${formatINR(s.value)}`).join(', ')}
          </desc>

          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {renderedSlices.map((slice, i) => (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              strokeLinecap="round"
            />
          ))}
        </svg>

        <div className={styles.centerText} aria-hidden="true">
          <span className={styles.centerValue}>{centerValue || formatINR(totalValue)}</span>
          <span className={styles.centerLabel}>{centerLabel}</span>
        </div>
      </div>

      {/* Visual Legend */}
      <div className={styles.legend} aria-hidden="true">
        {renderedSlices.map((slice, i) => (
          <div key={i} className={styles.legendItem}>
            <span
              className={styles.legendColor}
              style={{ backgroundColor: slice.color }}
            />
            <span>
              {slice.label}:{' '}
              <strong className={styles.legendValue}>{formatINR(slice.value)}</strong>
              {' '}({slice.percent}%)
            </span>
          </div>
        ))}
      </div>

      {/* Visible or Accessible Companion Table */}
      <table
        className={showTable ? styles.tableAccessible : 'visually-hidden'}
        aria-label={`${title} tabular data`}
      >
        <caption className="visually-hidden">{title}</caption>
        <thead>
          <tr>
            <th scope="col">Segment</th>
            <th scope="col">Amount</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {renderedSlices.map((s, i) => (
            <tr key={i}>
              <td>{s.label}</td>
              <td>{formatINR(s.value)}</td>
              <td>{s.percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
