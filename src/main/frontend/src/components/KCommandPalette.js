import React, { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';

/* DevZip // Kernel — 명령 팔레트 (⌘K).
   items: [{ id, group, icon, title, hint, keywords, run }] */
const KCommandPalette = ({ items, onClose }) => {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((it) =>
      (it.title + ' ' + (it.keywords || '') + ' ' + (it.group || '')).toLowerCase().includes(t)
    );
  }, [q, items]);

  useEffect(() => { setSel(0); }, [q]);

  // 연속된 같은 group끼리 묶어 헤더를 만든다.
  const rows = useMemo(() => {
    const out = [];
    let last = null;
    filtered.forEach((it) => {
      if (it.group !== last) { out.push({ header: it.group }); last = it.group; }
      out.push({ item: it });
    });
    return out;
  }, [filtered]);

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(filtered.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const it = filtered[sel];
      if (it) { it.run(); onClose(); }
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector('.k-cmdk-item.sel');
    if (el && el.scrollIntoViewIfNeeded) el.scrollIntoViewIfNeeded();
  }, [sel]);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="k-cmdk" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="k-cmdk-panel" role="dialog" aria-label="명령 팔레트">
        <div className="k-cmdk-in">
          <span className="pfx k-mono">›</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="프로젝트로 점프하거나 명령 실행…"
            aria-label="검색"
          />
          <span className="esc">ESC</span>
        </div>
        <div className="k-cmdk-list" ref={listRef}>
          {filtered.length === 0 && (
            <div className="k-cmdk-grp" style={{ padding: '18px 12px' }}>일치하는 항목이 없습니다.</div>
          )}
          {rows.map((r, i) => {
            if (r.header) return <div className="k-cmdk-grp" key={`h-${i}`}>{r.header}</div>;
            const idx = filtered.indexOf(r.item);
            return (
              <div
                key={r.item.id}
                className={`k-cmdk-item ${idx === sel ? 'sel' : ''}`}
                role="option"
                aria-selected={idx === sel}
                tabIndex={-1}
                onMouseEnter={() => setSel(idx)}
                onMouseDown={(e) => { e.preventDefault(); r.item.run(); onClose(); }}
              >
                <span className="ic">{r.item.icon}</span>
                <span className="t">{r.item.title}</span>
                {r.item.hint && <span className="h">{r.item.hint}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

KCommandPalette.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    group: PropTypes.string,
    icon: PropTypes.node,
    title: PropTypes.string.isRequired,
    hint: PropTypes.string,
    keywords: PropTypes.string,
    run: PropTypes.func.isRequired,
  })).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default KCommandPalette;
