import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

/* 의존성 없는 DOM 콘페티. trigger 값이 바뀔 때마다 한 번 터진다. */

const COLORS = ['#FFD23F', '#FF5C5C', '#4D7CFF', '#2FBF71', '#FF9F1C', '#161310'];
const PIECES = 90;

const buildBurst = (seed) => {
  // Math.random 대신 seed 기반 의사난수로 SSR/결정성 우려를 피한다.
  const rand = (i, salt) => {
    const x = Math.sin((seed + 1) * 9301 + i * 49297 + salt * 233280) * 43758.5453;
    return x - Math.floor(x);
  };
  return Array.from({ length: PIECES }, (_, i) => ({
    id: `${seed}-${i}`,
    left: rand(i, 1) * 100,
    delay: rand(i, 2) * 0.35,
    duration: 1.8 + rand(i, 3) * 1.6,
    drift: (rand(i, 4) - 0.5) * 240,
    rotate: rand(i, 5) * 720,
    size: 7 + rand(i, 6) * 8,
    color: COLORS[Math.floor(rand(i, 7) * COLORS.length)],
    round: rand(i, 8) > 0.6,
  }));
};

const Confetti = ({ trigger }) => {
  const [burst, setBurst] = useState(null);

  useEffect(() => {
    if (!trigger) return undefined;
    setBurst(buildBurst(trigger));
    const t = setTimeout(() => setBurst(null), 3600);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!burst) return null;

  return (
    <div className="gz-confetti" aria-hidden="true">
      {burst.map((p) => (
        <span
          key={p.id}
          className="gz-confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.4}px`,
            background: p.color,
            borderRadius: p.round ? '50%' : '2px',
            '--gz-drift': `${p.drift}px`,
            '--gz-rotate': `${p.rotate}deg`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

Confetti.propTypes = {
  trigger: PropTypes.number,
};

export default Confetti;
