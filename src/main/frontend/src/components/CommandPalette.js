import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import projects from '../data/projects';
import './CommandPalette.css';

// 프로젝트 목록 + 고정 목적지를 하나의 커맨드 목록으로 합친다.
const STATIC_COMMANDS = [
    { id: 'nav-home', name: '홈', description: '메인 프로젝트 허브로 이동', to: '/', icon: '🏠', group: '이동' },
    { id: 'nav-latency', name: '레이턴시 아레나', description: '엔드포인트 응답 속도를 측정·비교하는 실험', to: '/latency-arena', icon: '📡', group: '이동' },
    { id: 'ext-github', name: 'GitHub', description: 'hoooon22의 GitHub 프로필', href: 'https://github.com/Hoooon22', icon: '🐙', group: '외부' },
];

const buildCommands = () => {
    const fromProjects = projects.map((p) => {
        const external = typeof p.link === 'string' && /^https?:\/\//.test(p.link);
        return {
            id: `proj-${p.id}`,
            name: p.name,
            description: p.description,
            icon: p.thumbnail || '📦',
            group: p.isProduction ? '운영 중' : '실험실',
            keywords: [p.category, p.isProduction ? 'production live 운영' : 'experiment lab 실험']
                .filter(Boolean)
                .join(' '),
            ...(external ? { href: p.link } : { to: p.link }),
        };
    });
    return [...STATIC_COMMANDS, ...fromProjects];
};

// 부분 문자열 + 순서 보존 부분열(subsequence) 매칭. 점수가 낮을수록 더 좋은 매칭.
const scoreMatch = (query, text) => {
    if (!query) return 0;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    const idx = t.indexOf(q);
    if (idx !== -1) return idx; // 연속 매칭이 가장 우선
    // 부분열 매칭
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i += 1) {
        if (t[i] === q[qi]) qi += 1;
    }
    return qi === q.length ? 500 + (t.length - q.length) : Infinity;
};

const CommandPalette = () => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const commands = useMemo(buildCommands, []);

    const results = useMemo(() => {
        if (!query.trim()) return commands;
        return commands
            .map((c) => {
                const haystacks = [c.name, c.description, c.keywords].filter(Boolean);
                const best = Math.min(...haystacks.map((h) => scoreMatch(query.trim(), h)));
                return { c, score: best };
            })
            .filter((r) => r.score !== Infinity)
            .sort((a, b) => a.score - b.score)
            .map((r) => r.c);
    }, [query, commands]);

    // 전역 단축키: Cmd/Ctrl+K 토글, Esc 닫기.
    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                setOpen((v) => !v);
            } else if (e.key === 'Escape') {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // 열릴 때 입력창 포커스 + 상태 초기화.
    useEffect(() => {
        if (open) {
            setQuery('');
            setActive(0);
            // 다음 프레임에 포커스 (오버레이 렌더 직후).
            const id = window.requestAnimationFrame(() => inputRef.current?.focus());
            return () => window.cancelAnimationFrame(id);
        }
        return undefined;
    }, [open]);

    useEffect(() => { setActive(0); }, [query]);

    // 선택 항목이 보이도록 스크롤.
    useEffect(() => {
        if (!open || !listRef.current) return;
        const el = listRef.current.querySelector(`[data-idx="${active}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [active, open, results]);

    const run = (cmd) => {
        setOpen(false);
        if (!cmd) return;
        if (cmd.href) {
            window.open(cmd.href, '_blank', 'noopener,noreferrer');
        } else if (cmd.to) {
            navigate(cmd.to);
        }
    };

    const onInputKey = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            run(results[active]);
        }
    };

    return (
        <>
            <button
                type="button"
                className="cmdk-launcher"
                onClick={() => setOpen(true)}
                aria-label="명령 팔레트 열기"
                title="명령 팔레트 (⌘K / Ctrl+K)"
            >
                <span className="cmdk-launcher-icn" aria-hidden="true">⌘</span>
                <span className="cmdk-launcher-key">K</span>
            </button>

            {open && (
                <div className="cmdk-overlay">
                    <button
                        type="button"
                        className="cmdk-backdrop"
                        aria-label="명령 팔레트 닫기"
                        onClick={() => setOpen(false)}
                    />
                    <div
                        className="cmdk-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="명령 팔레트"
                    >
                        <div className="cmdk-input-row">
                            <span className="cmdk-prompt" aria-hidden="true">›</span>
                            <input
                                ref={inputRef}
                                className="cmdk-input"
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={onInputKey}
                                placeholder="프로젝트·실험 검색…"
                                aria-label="검색"
                            />
                            <kbd className="cmdk-esc">ESC</kbd>
                        </div>

                        <div className="cmdk-list" ref={listRef}>
                            {results.length === 0 ? (
                                <div className="cmdk-empty">🚧 일치하는 항목이 없습니다.</div>
                            ) : (
                                results.map((cmd, i) => (
                                    <button
                                        type="button"
                                        key={cmd.id}
                                        data-idx={i}
                                        className={`cmdk-item ${i === active ? 'on' : ''}`}
                                        onMouseEnter={() => setActive(i)}
                                        onClick={() => run(cmd)}
                                    >
                                        <span className="cmdk-item-icn" aria-hidden="true">{cmd.icon}</span>
                                        <span className="cmdk-item-body">
                                            <span className="cmdk-item-name">{cmd.name}</span>
                                            <span className="cmdk-item-desc">{cmd.description}</span>
                                        </span>
                                        <span className="cmdk-item-group">{cmd.group}</span>
                                        {cmd.href && <span className="cmdk-item-ext" aria-hidden="true">↗</span>}
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="cmdk-foot">
                            <span><kbd>↑</kbd><kbd>↓</kbd> 이동</span>
                            <span><kbd>↵</kbd> 열기</span>
                            <span><kbd>esc</kbd> 닫기</span>
                            <span className="cmdk-foot-count">{results.length}개</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CommandPalette;
