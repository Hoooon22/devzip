import React, { useState, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/* DevZip // Kernel — 히어로(MOTD.md) 오른쪽 부트 로그를 클릭하면 열리는 검색 터미널.
   프로젝트 이름·부제·설명·카테고리·스택을 대상으로 검색해 매칭 페이지로 점프한다. */

// 검색 대상 텍스트 — 프로젝트 카드가 가진 모든 사람이 읽는 필드를 한 줄로 합친다.
const haystack = (p) =>
  `${p.name} ${p.subtitle || ''} ${p.description || ''} ${p.category || ''} ${(p.techStack || p.tech || []).join(' ')}`
    .toLowerCase();

const HeroTerminal = ({ projects, username, onOpen, onClose }) => {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // 공백으로 나눈 모든 토큰을 포함하는 프로젝트만(AND 검색), 최대 6개.
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const terms = t.split(/\s+/);
    return projects
      .filter((p) => { const hay = haystack(p); return terms.every((term) => hay.includes(term)); })
      .slice(0, 6);
  }, [q, projects]);

  useEffect(() => { setSel(0); }, [q]);

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[sel]) onOpen(results[sel]); }
  };

  const q0 = q.trim();

  return (
    <div className="k-term" role="group" aria-label="프로젝트 검색 터미널">
      <div className="k-term-head">
        <span className="k-term-prompt">
          <span className="user">{username}</span>@devzip<span className="path">:~$</span> search --projects
        </span>
        <button type="button" className="k-term-x" onClick={onClose} aria-label="터미널 닫기">esc</button>
      </div>
      <div className="k-term-in">
        <span className="caret">›</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="프로젝트 이름·키워드 입력…"
          aria-label="프로젝트 검색"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <div className="k-term-out">
        {q0 === '' ? (
          <div className="k-term-hint">{'// 예: pathfind · ai · 네트워크 · 검색 …'}</div>
        ) : results.length === 0 ? (
          <div className="k-term-hint">{`no matches for "${q0}"`}</div>
        ) : (
          <ul className="k-term-list">
            {results.map((p, i) => (
              <li key={p.id}>
                <a
                  href={p.link}
                  className={`k-term-item ${i === sel ? 'sel' : ''}`}
                  onMouseEnter={() => setSel(i)}
                  onClick={(e) => { e.preventDefault(); onOpen(p); }}
                >
                  <span className="gl">{p.thumbnail || '📦'}</span>
                  <span className="nm">{p.name}</span>
                  {p.subtitle && <span className="sub">{p.subtitle}</span>}
                  <span className="go">→</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      {results.length > 0 && (
        <div className="k-term-foot k-mono">↑↓ 이동 · ↵ 열기 · esc 닫기 · {results.length} matches</div>
      )}
    </div>
  );
};

HeroTerminal.propTypes = {
  projects: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    link: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    thumbnail: PropTypes.string,
  })).isRequired,
  username: PropTypes.string.isRequired,
  onOpen: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default HeroTerminal;
