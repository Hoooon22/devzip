import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useGame } from '../../contexts/GameContext';
import Confetti from './Confetti';
import './GameHud.scss';

const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a',
];

// 진행도 링의 원주 (r=22)
const RING = 2 * Math.PI * 22;

const PointToast = ({ toast, onDone }) => {
  useEffect(() => {
    const t = setTimeout(() => onDone(toast.id), 2200);
    return () => clearTimeout(t);
  }, [toast.id, onDone]);

  return (
    <div className="gz-toast" role="status">
      <span className="gz-toast-icon">{toast.icon}</span>
      <span className="gz-toast-reason">{toast.reason}</span>
      <span className="gz-toast-amt">+{toast.amount} XP</span>
    </div>
  );
};

PointToast.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.number.isRequired,
    icon: PropTypes.string,
    reason: PropTypes.string,
    amount: PropTypes.number,
  }).isRequired,
  onDone: PropTypes.func.isRequired,
};

const GameHud = () => {
  const {
    level, title, xp, progress, toNext,
    toasts, dismissToast, levelUp, clearLevelUp,
    celebrations, award, celebrate,
  } = useGame();

  const [open, setOpen] = useState(false);
  const konamiRef = useRef([]);

  // 첫 방문 보상 (전역 1회).
  useEffect(() => {
    award(10, '데브집 방문을 환영해요!', { once: true, key: 'first-visit', icon: '🎉' });
  }, [award]);

  // 이스터에그: 코나미 커맨드.
  useEffect(() => {
    const onKey = (e) => {
      const next = [...konamiRef.current, e.key].slice(-KONAMI.length);
      konamiRef.current = next;
      if (next.length === KONAMI.length && next.every((k, i) => k === KONAMI[i])) {
        konamiRef.current = [];
        const gained = award(77, '치트키 발견! 당신은 진정한 탐험가', { once: true, key: 'konami', icon: '🕹️' });
        celebrate();
        if (!gained) {
          award(7, '또 만났네요, 치트키 마스터', { icon: '🕹️' });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [award, celebrate]);

  // 레벨업 배너 자동 닫기.
  useEffect(() => {
    if (!levelUp) return undefined;
    const t = setTimeout(clearLevelUp, 3600);
    return () => clearTimeout(t);
  }, [levelUp, clearLevelUp]);

  const dash = RING * (1 - Math.min(Math.max(progress, 0), 1));

  return (
    <>
      <Confetti trigger={celebrations} />

      {levelUp && (
        <div
          className="gz-levelup"
          role="button"
          tabIndex={0}
          aria-label="레벨업 닫기"
          onClick={clearLevelUp}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') clearLevelUp(); }}
        >
          <div className="gz-levelup-card">
            <div className="gz-levelup-spark">⭐</div>
            <div className="gz-levelup-label">LEVEL UP!</div>
            <div className="gz-levelup-lv">Lv.{levelUp.level}</div>
            <div className="gz-levelup-title">{levelUp.title}</div>
          </div>
        </div>
      )}

      <div className="gz-toasts">
        {toasts.map((t) => (
          <PointToast key={t.id} toast={t} onDone={dismissToast} />
        ))}
      </div>

      <div className={`gz-hud ${open ? 'open' : ''}`}>
        {open && (
          <div className="gz-panel">
            <div className="gz-panel-head">
              <span className="gz-panel-title">{title}</span>
              <button
                type="button"
                className="gz-panel-close"
                onClick={() => setOpen(false)}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="gz-panel-xp">
              <strong>{xp.toLocaleString()}</strong> XP
            </div>
            <div className="gz-panel-bar">
              <span style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="gz-panel-next">다음 레벨까지 {toNext.toLocaleString()} XP</div>
            <ul className="gz-panel-hints">
              <li>🧭 프로젝트를 열어보면 XP를 얻어요</li>
              <li>🌗 다크 모드·보기 전환에도 보상이!</li>
              <li>🕹️ 숨겨진 치트키를 찾아보세요</li>
            </ul>
          </div>
        )}

        <button
          type="button"
          className="gz-badge"
          onClick={() => setOpen((o) => !o)}
          aria-label={`레벨 ${level} · ${title}`}
          title={`Lv.${level} ${title}`}
        >
          <svg className="gz-ring" viewBox="0 0 50 50" aria-hidden="true">
            <circle className="gz-ring-bg" cx="25" cy="25" r="22" />
            <circle
              className="gz-ring-fg"
              cx="25"
              cy="25"
              r="22"
              strokeDasharray={RING}
              strokeDashoffset={dash}
            />
          </svg>
          <span className="gz-badge-lv">
            <span className="gz-badge-num">{level}</span>
            <span className="gz-badge-cap">LV</span>
          </span>
        </button>
      </div>
    </>
  );
};

export default GameHud;
