import { useEffect, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { RISK_COLOR_VAR, RISK_LABEL } from "../../utils/enums.js";
import "./FraudMeter.css";

/**
 * Animated fraud risk meter.
 *
 *   - Half-circle SVG gauge from 0..100.
 *   - Fills to the actual `score` via Framer Motion's `useMotionValue`
 *     (smooth stroke-dashoffset animation).
 *   - Numeric readout counts up in sync.
 *   - Colour follows LOW / MEDIUM / HIGH bands from the shared enums.
 */

const RADIUS = 90;
const CIRCUMFERENCE = Math.PI * RADIUS; // half-circle length
const CENTER_X = 110;
const CENTER_Y = 110;

function riskLevelFromScore(score) {
  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

export function FraudMeter({ score = 0, size = "md", label }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const level = riskLevelFromScore(clamped);
  const color = RISK_COLOR_VAR[level];

  const progress = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(progress, clamped, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [clamped, progress]);

  const dashOffset = CIRCUMFERENCE - (CIRCUMFERENCE * display) / 100;

  return (
    <figure className={`fraud-meter fraud-meter--${size}`} data-testid="fraud-meter">
      <svg viewBox="0 0 220 130" className="fraud-meter__svg" role="img" aria-label={`${level} risk, score ${clamped}`}>
        {/* Track */}
        <path
          d={`M ${CENTER_X - RADIUS} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER_X + RADIUS} ${CENTER_Y}`}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Value */}
        <motion.path
          d={`M ${CENTER_X - RADIUS} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER_X + RADIUS} ${CENTER_Y}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          filter="url(#fraud-meter-glow)"
        />
        {/* Tick marks for LOW/MEDIUM/HIGH bands */}
        <TickAt score={30} />
        <TickAt score={60} />
        <defs>
          <filter id="fraud-meter-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div className="fraud-meter__center">
        <span className="fraud-meter__value number-display" style={{ color }}>
          {display}
        </span>
        <span className="fraud-meter__unit">/ 100</span>
        <span
          className="fraud-meter__level"
          style={{ color, background: `color-mix(in oklab, ${color} 14%, transparent)` }}
        >
          {label || RISK_LABEL[level]}
        </span>
      </div>

      <figcaption className="fraud-meter__bands" aria-hidden>
        <span>0</span>
        <span>LOW · MEDIUM · HIGH</span>
        <span>100</span>
      </figcaption>
    </figure>
  );
}

function TickAt({ score }) {
  // Convert score to angle along the half-circle (180° range, 0° = left).
  const angle = Math.PI * (score / 100); // radians from left endpoint
  const inner = RADIUS - 12;
  const outer = RADIUS + 12;
  const x1 = CENTER_X - Math.cos(angle) * inner;
  const y1 = CENTER_Y - Math.sin(angle) * inner;
  const x2 = CENTER_X - Math.cos(angle) * outer;
  const y2 = CENTER_Y - Math.sin(angle) * outer;
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="var(--color-text-subtle)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.6"
    />
  );
}