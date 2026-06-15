import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/LatencyArena.css';

// 측정 대상 프리셋. 모두 no-cors로 왕복 시간만 측정하므로 CORS 허용 여부와 무관하게 동작한다.
const PRESETS = [
    { key: 'devzip', label: 'DevZip API', url: '/api/hello', on: true },
    { key: 'jsonph', label: 'JSONPlaceholder', url: 'https://jsonplaceholder.typicode.com/posts/1', on: true },
    { key: 'github', label: 'GitHub API', url: 'https://api.github.com', on: true },
    { key: 'cloudflare', label: 'Cloudflare', url: 'https://1.1.1.1/cdn-cgi/trace', on: false },
    { key: 'httpbin', label: 'httpbin', url: 'https://httpbin.org/get', on: false },
];

const ROUND_OPTIONS = [6, 12, 20];

// 정렬된 표본에서 분위수를 뽑는다.
const quantile = (sorted, p) =>
    sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];

const computeStats = (samples) => {
    if (!samples.length) return null;
    const s = [...samples].sort((a, b) => a - b);
    const avg = s.reduce((a, b) => a + b, 0) / s.length;
    return {
        min: s[0],
        p50: quantile(s, 0.5),
        p95: quantile(s, 0.95),
        max: s[s.length - 1],
        avg,
        n: s.length,
    };
};

const fmt = (ms) => (ms == null ? '–' : `${Math.round(ms)}ms`);

const LatencyArena = () => {
    const [endpoints, setEndpoints] = useState(PRESETS);
    const [rounds, setRounds] = useState(12);
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState({}); // { key: { samples:[], errors:0 } }
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [customUrl, setCustomUrl] = useState('');
    const abortRef = useRef(false);

    const toggle = (key) => {
        if (running) return;
        setEndpoints((list) => list.map((e) => (e.key === key ? { ...e, on: !e.on } : e)));
    };

    const addCustom = () => {
        const url = customUrl.trim();
        if (!url || !/^https?:\/\//.test(url)) {
            alert('http(s):// 로 시작하는 URL을 입력하세요.');
            return;
        }
        const key = `custom-${url}`;
        if (endpoints.some((e) => e.key === key)) { setCustomUrl(''); return; }
        let host = url;
        try { host = new URL(url).host; } catch { /* keep raw */ }
        setEndpoints((list) => [...list, { key, label: host, url, on: true, custom: true }]);
        setCustomUrl('');
    };

    const removeCustom = (key) => {
        if (running) return;
        setEndpoints((list) => list.filter((e) => e.key !== key));
    };

    const stop = () => { abortRef.current = true; };

    const run = async () => {
        const selected = endpoints.filter((e) => e.on);
        if (selected.length === 0) { alert('측정할 엔드포인트를 하나 이상 선택하세요.'); return; }

        abortRef.current = false;
        setRunning(true);
        const fresh = {};
        selected.forEach((e) => { fresh[e.key] = { samples: [], errors: 0 }; });
        setResults(fresh);
        setProgress({ done: 0, total: rounds * selected.length });

        let done = 0;
        for (let r = 0; r < rounds; r += 1) {
            for (const ep of selected) {
                if (abortRef.current) break;
                const bust = `${ep.url.includes('?') ? '&' : '?'}_=${Date.now()}-${r}`;
                const t0 = performance.now();
                try {
                    await fetch(ep.url + bust, { mode: 'no-cors', cache: 'no-store' });
                    const dt = performance.now() - t0;
                    setResults((prev) => ({
                        ...prev,
                        [ep.key]: { ...prev[ep.key], samples: [...prev[ep.key].samples, dt] },
                    }));
                } catch {
                    setResults((prev) => ({
                        ...prev,
                        [ep.key]: { ...prev[ep.key], errors: prev[ep.key].errors + 1 },
                    }));
                }
                done += 1;
                setProgress((p) => ({ ...p, done }));
            }
            if (abortRef.current) break;
        }
        setRunning(false);
    };

    // 측정 결과를 표시용으로 가공.
    const rows = useMemo(() => {
        const selected = endpoints.filter((e) => e.on || results[e.key]);
        return selected
            .map((ep) => {
                const data = results[ep.key] || { samples: [], errors: 0 };
                return { ep, stats: computeStats(data.samples), errors: data.errors, samples: data.samples };
            })
            .filter((r) => r.stats || r.errors)
            .sort((a, b) => {
                if (!a.stats) return 1;
                if (!b.stats) return -1;
                return a.stats.p50 - b.stats.p50;
            });
    }, [endpoints, results]);

    const maxBar = useMemo(() => {
        const vals = rows.filter((r) => r.stats).map((r) => r.stats.p95);
        return vals.length ? Math.max(...vals) : 1;
    }, [rows]);

    const winnerKey = rows.find((r) => r.stats)?.ep.key;
    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

    return (
        <div className="la-container">
            <div className="la-inner">
                <Link to="/" className="la-back">← 허브로</Link>

                <header className="la-header">
                    <span className="la-eyebrow">★ network latency arena</span>
                    <h1 className="la-title">LATENCY<br />ARENA</h1>
                    <p className="la-lede">
                        같은 요청을 여러 엔드포인트에 반복해서 던지고, 왕복 시간(RTT)을 측정해 비교합니다.
                        브라우저에서 직접 <code>no-cors</code>로 측정하므로 응답 본문은 읽지 않고 <strong>네트워크 왕복 속도</strong>만 잽니다.
                    </p>
                </header>

                <section className="la-controls">
                    <div className="la-targets">
                        {endpoints.map((ep) => (
                            <div key={ep.key} className={`la-target ${ep.on ? 'on' : ''}`}>
                                <button
                                    type="button"
                                    className="la-target-toggle"
                                    onClick={() => toggle(ep.key)}
                                    disabled={running}
                                    aria-pressed={ep.on}
                                >
                                    <span className="la-check" aria-hidden="true">{ep.on ? '◼' : '◻'}</span>
                                    <span className="la-target-label">{ep.label}</span>
                                    <span className="la-target-url">{ep.url}</span>
                                </button>
                                {ep.custom && (
                                    <button
                                        type="button"
                                        className="la-target-del"
                                        onClick={() => removeCustom(ep.key)}
                                        disabled={running}
                                        aria-label={`${ep.label} 제거`}
                                    >✕</button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="la-custom">
                        <input
                            type="text"
                            className="la-custom-input"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }}
                            placeholder="https://your-endpoint.com/..."
                            disabled={running}
                        />
                        <button type="button" className="la-custom-add" onClick={addCustom} disabled={running}>
                            + 추가
                        </button>
                    </div>

                    <div className="la-runbar">
                        <div className="la-rounds">
                            <span className="la-rounds-lbl">요청 횟수</span>
                            {ROUND_OPTIONS.map((n) => (
                                <button
                                    type="button"
                                    key={n}
                                    className={`la-round-opt ${rounds === n ? 'on' : ''}`}
                                    onClick={() => setRounds(n)}
                                    disabled={running}
                                >{n}</button>
                            ))}
                        </div>
                        {running ? (
                            <button type="button" className="la-run stop" onClick={stop}>■ 중단</button>
                        ) : (
                            <button type="button" className="la-run" onClick={run}>▶ 측정 시작</button>
                        )}
                    </div>

                    {(running || progress.done > 0) && (
                        <div className="la-progress">
                            <div className="la-progress-bar"><span style={{ width: `${pct}%` }} /></div>
                            <span className="la-progress-txt">{progress.done} / {progress.total} 요청 · {pct}%</span>
                        </div>
                    )}
                </section>

                {rows.length === 0 ? (
                    <div className="la-empty">
                        측정할 엔드포인트를 고르고 <strong>측정 시작</strong>을 누르세요.
                    </div>
                ) : (
                    <section className="la-results">
                        <h2 className="la-results-title">결과 <span>(중앙값 p50 기준 정렬)</span></h2>
                        {rows.map((r) => {
                            const w = r.stats ? Math.max(4, (r.stats.p95 / maxBar) * 100) : 0;
                            const isWinner = r.ep.key === winnerKey && r.stats;
                            return (
                                <div className={`la-card ${isWinner ? 'winner' : ''}`} key={r.ep.key}>
                                    <div className="la-card-head">
                                        <span className="la-card-name">
                                            {isWinner && <span className="la-crown" aria-hidden="true">👑</span>}
                                            {r.ep.label}
                                        </span>
                                        <span className="la-card-p50">{r.stats ? fmt(r.stats.p50) : '실패'}</span>
                                    </div>

                                    <div className="la-bar-track">
                                        <span className="la-bar" style={{ width: `${w}%` }} />
                                        {r.samples.length > 0 && (
                                            <span className="la-spark">
                                                {r.samples.slice(-20).map((s, i) => {
                                                    const h = Math.max(8, Math.min(100, (s / maxBar) * 100));
                                                    return (
                                                        <span
                                                            // 스파크라인 표본은 순서 자체가 정체성이라 인덱스 키가 적절하다.
                                                            // eslint-disable-next-line react/no-array-index-key
                                                            key={`${r.ep.key}-s-${i}`}
                                                            className="la-spark-bar"
                                                            style={{ height: `${h}%` }}
                                                            title={fmt(s)}
                                                        />
                                                    );
                                                })}
                                            </span>
                                        )}
                                    </div>

                                    <div className="la-stats">
                                        <span><b>min</b>{r.stats ? fmt(r.stats.min) : '–'}</span>
                                        <span><b>p50</b>{r.stats ? fmt(r.stats.p50) : '–'}</span>
                                        <span><b>p95</b>{r.stats ? fmt(r.stats.p95) : '–'}</span>
                                        <span><b>max</b>{r.stats ? fmt(r.stats.max) : '–'}</span>
                                        <span><b>n</b>{r.stats ? r.stats.n : 0}</span>
                                        {r.errors > 0 && <span className="la-stat-err"><b>err</b>{r.errors}</span>}
                                    </div>
                                </div>
                            );
                        })}
                        <p className="la-note">
                            ※ 첫 요청은 DNS·TLS 핸드셰이크 때문에 느릴 수 있습니다. p50(중앙값)이 체감 속도에 가장 가깝습니다.
                            측정값은 측정하는 위치의 네트워크 환경에 따라 달라집니다.
                        </p>
                    </section>
                )}
            </div>
        </div>
    );
};

export default LatencyArena;
