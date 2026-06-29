/**
 * AnimatedCircularProgressBar
 * Matches the Magic UI @magicui/animated-circular-progress-bar style exactly:
 *  - 270° arc with gap centered at the bottom
 *  - Thick rounded stroke ends
 *  - Smooth animated fill
 *  - Centered value label
 *
 * Props:
 *  - value:               0–100
 *  - max:                 default 100
 *  - min:                 default 0
 *  - gaugePrimaryColor:   filled arc color   (default: AWS #FF9900)
 *  - gaugeSecondaryColor: track color        (default: faint orange)
 *  - className:           extra CSS class on wrapper
 */
export function AnimatedCircularProgressBar({
  value = 0,
  max = 100,
  min = 0,
  gaugePrimaryColor = '#FF9900',
  gaugeSecondaryColor = 'rgba(255,153,0,0.12)',
  className = '',
}) {
  const size = 130;
  const strokeWidth = 13;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // 270° arc — gap (90°) centred at the bottom
  const arcFraction = 0.75; // 270° / 360°
  const arcLength = arcFraction * circumference;
  const gapLength = (1 - arcFraction) * circumference;

  // Clamp value to [min, max] → 0-100 %
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  // How much of the 270° arc should be filled
  const fillLength = (pct / 100) * arcLength;

  // Rotate so the gap (unused part of dasharray) sits at the bottom centre.
  // SVG 0° = 3-o'clock. We want arc to start at 7:30 → 225° from 12-o'clock
  // = 225 - 90 = 135° from 3-o'clock.
  const svgRotation = 135;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: `rotate(${svgRotation}deg)` }}
      >
        {/* ── Track: full 270° arc ── */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gaugeSecondaryColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${gapLength}`}
        />

        {/* ── Filled arc: animates from 0 → pct of the 270° ── */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gaugePrimaryColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${fillLength} ${circumference - fillLength}`}
          style={{
            transition: 'stroke-dasharray 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 5px ${gaugePrimaryColor}99)`,
          }}
        />
      </svg>

      {/* ── Centre label ── */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', 'Segoe UI', monospace",
            fontSize: 26,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1,
            letterSpacing: '-0.03em',
          }}
        >
          {Math.round(pct)}
        </span>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 9,
            fontWeight: 600,
            color: gaugePrimaryColor,
            letterSpacing: '0.1em',
            marginTop: 2,
            textTransform: 'uppercase',
          }}
        >
          %
        </span>
      </div>
    </div>
  );
}
