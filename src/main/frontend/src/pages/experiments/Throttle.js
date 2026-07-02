import React, { useEffect, useRef, useState, useCallback } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Throttle.css';

// THROTTLE — 요청 속도 제한(토큰 버킷) 실험.
// 핵심: 버킷에는 최대 capacity개의 토큰이 담긴다. 토큰은 초당 refillRate개씩 다시 채워진다.
// 요청 하나가 도착하면 토큰 1개를 소비한다. 토큰이 없으면 그 요청은 거절(429)된다.
// 그래서 "평균 처리율은 refillRate로 묶이되, capacity만큼의 순간 폭주(burst)는 허용"된다 —
// 폭주로부터 뒤쪽 서비스를 지키면서도, 잠깐의 몰림은 부드럽게 받아내는 보편적 장치.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const Throttle = () => {
    // 사용자 조작 대상 (컨트롤)
    const [capacity, setCapacity] = useState(10);
    const [refillRate, setRefillRate] = useState(5); // 토큰/초
    const [autoRate, setAutoRate] = useState(3);     // 자동 트래픽 요청/초
    const [auto, setAuto] = useState(true);

    // 렌더용 스냅샷 (프레임마다 1회 갱신)
    const [view, setView] = useState({ tokens: 10, total: 0, ok: 0, rej: 0, log: [] });

    // 애니메이션 루프가 만지는 상태는 ref로 (매 프레임 setState 폭주 방지)
    const tokensRef = useRef(capacity);
    const statsRef = useRef({ total: 0, ok: 0, rej: 0 });
    const logRef = useRef([]);
    const idRef = useRef(0);
    const accRef = useRef(0);   // 자동 트래픽 누적기
    const lastRef = useRef(0);
    const rafRef = useRef(0);
    // 루프가 최신 설정값을 읽도록 미러링
    const cfgRef = useRef({ capacity, refillRate, autoRate, auto });
    useEffect(() => {
        cfgRef.current = { capacity, refillRate, autoRate, auto };
        // capacity가 줄면 현재 토큰도 그 안으로 잘라준다
        tokensRef.current = clamp(tokensRef.current, 0, capacity);
    }, [capacity, refillRate, autoRate, auto]);

    // 요청 하나 처리: 토큰이 있으면 수락(소비), 없으면 거절(429)
    const doRequest = useCallback(() => {
        const ok = tokensRef.current >= 1;
        if (ok) tokensRef.current -= 1;
        const s = statsRef.current;
        s.total += 1;
        if (ok) s.ok += 1; else s.rej += 1;
        logRef.current.push({ id: idRef.current++, ok });
        if (logRef.current.length > 240) logRef.current = logRef.current.slice(-240);
    }, []);

    // rAF 루프: 토큰 충전 + 자동 트래픽 발생 + 렌더 스냅샷
    useEffect(() => {
        const step = (now) => {
            const cfg = cfgRef.current;
            if (!lastRef.current) lastRef.current = now;
            let dt = (now - lastRef.current) / 1000;
            lastRef.current = now;
            if (dt > 0.25) dt = 0.25; // 탭 비활성 등으로 튄 큰 간격은 눌러준다

            tokensRef.current = clamp(tokensRef.current + cfg.refillRate * dt, 0, cfg.capacity);

            if (cfg.auto && cfg.autoRate > 0) {
                accRef.current += cfg.autoRate * dt;
                let guard = 0;
                while (accRef.current >= 1 && guard < 64) { accRef.current -= 1; doRequest(); guard++; }
            }

            const s = statsRef.current;
            setView({ tokens: tokensRef.current, total: s.total, ok: s.ok, rej: s.rej, log: logRef.current.slice(-56) });
            rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafRef.current);
    }, [doRequest]);

    const burst = useCallback(() => { for (let i = 0; i < 12; i++) doRequest(); }, [doRequest]);
    const single = useCallback(() => doRequest(), [doRequest]);
    const reset = useCallback(() => {
        tokensRef.current = cfgRef.current.capacity;
        statsRef.current = { total: 0, ok: 0, rej: 0 };
        logRef.current = [];
        accRef.current = 0;
    }, []);

    const acceptRate = view.total > 0 ? Math.round((view.ok / view.total) * 100) : 100;
    const filled = Math.floor(view.tokens);
    const frac = view.tokens - filled;

    return (
        <LabShell
            title="THROTTLE"
            eyebrow="rate limiting"
            subtitle={'// 요청 폭주를 다스리는 토큰 버킷 — 평균은 묶고, 순간 폭주는 받아낸다'}
            path="throttle.exe"
        >
            <section className="k-win tb-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/proc/</span>rate-limiter</span>
                    <span className="meta k-mono">token bucket</span>
                </div>

                <div className="tb-toolbar">
                    <div className="tb-ctrl">
                        <label className="tb-ctrl-label k-mono" htmlFor="tb-cap">버킷 용량 <b>{capacity}</b></label>
                        <input id="tb-cap" type="range" min="1" max="20" step="1"
                            value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
                    </div>
                    <div className="tb-ctrl">
                        <label className="tb-ctrl-label k-mono" htmlFor="tb-refill">충전 속도 <b>{refillRate}</b>/s</label>
                        <input id="tb-refill" type="range" min="0" max="12" step="0.5"
                            value={refillRate} onChange={(e) => setRefillRate(Number(e.target.value))} />
                    </div>
                    <div className="tb-ctrl">
                        <label className="tb-ctrl-label k-mono" htmlFor="tb-auto">자동 트래픽 <b>{autoRate}</b>/s</label>
                        <input id="tb-auto" type="range" min="0" max="16" step="1"
                            value={autoRate} onChange={(e) => setAutoRate(Number(e.target.value))} />
                    </div>

                    <div className="tb-actions">
                        <button type="button"
                            className={`tb-seg ${auto ? 'is-active' : ''}`}
                            onClick={() => setAuto((a) => !a)}>
                            {auto ? '❚❚ 트래픽 멈춤' : '▶ 트래픽 재생'}
                        </button>
                        <button type="button" className="tb-btn tb-btn-ghost" onClick={single}>요청 1건</button>
                        <button type="button" className="tb-btn" onClick={burst}>⚡ 폭주 ×12</button>
                        <button type="button" className="tb-btn tb-btn-ghost" onClick={reset}>리셋</button>
                    </div>
                </div>

                <div className="tb-stage">
                    <div className="tb-bucket-col">
                        <div className="tb-bucket-head k-mono">
                            <span>버킷</span>
                            <span className="tb-tok-read">{view.tokens.toFixed(1)} / {capacity}</span>
                        </div>
                        <div className="tb-bucket" role="img"
                            aria-label={`토큰 ${view.tokens.toFixed(1)}개 남음, 용량 ${capacity}`}>
                            {Array.from({ length: capacity }).map((_, i) => {
                                const full = i < filled;
                                const partial = i === filled ? frac : 0;
                                return (
                                    <div key={i} className={`tb-cell ${full ? 'is-full' : ''}`}>
                                        {partial > 0 && (
                                            <span className="tb-cell-frac" style={{ height: `${partial * 100}%` }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="tb-bucket-foot k-mono">
                            {view.tokens < 1 ? '토큰 고갈 — 새 요청은 429' : '토큰 소비 = 요청 수락'}
                        </p>
                    </div>

                    <div className="tb-right">
                        <div className="tb-stream-head k-mono">
                            <span>요청 스트림</span>
                            <span className="tb-legend">
                                <i className="tb-dot tb-dot-ok" /> 200
                                <i className="tb-dot tb-dot-rej" /> 429
                            </span>
                        </div>
                        <div className="tb-stream">
                            {view.log.length === 0 && <span className="tb-stream-empty k-mono">요청 대기 중…</span>}
                            {view.log.map((r) => (
                                <span key={r.id} className={`tb-tick ${r.ok ? 'is-ok' : 'is-rej'}`} />
                            ))}
                        </div>

                        <div className="tb-stats">
                            <div className="tb-stat">
                                <span className="tb-stat-num k-mono">{view.total}</span>
                                <span className="tb-stat-lab">전체 요청</span>
                            </div>
                            <div className="tb-stat">
                                <span className="tb-stat-num k-mono tb-ok">{view.ok}</span>
                                <span className="tb-stat-lab">수락 200</span>
                            </div>
                            <div className="tb-stat">
                                <span className="tb-stat-num k-mono tb-rej">{view.rej}</span>
                                <span className="tb-stat-lab">거절 429</span>
                            </div>
                            <div className="tb-stat">
                                <span className="tb-stat-num k-mono">{acceptRate}%</span>
                                <span className="tb-stat-lab">수락률</span>
                            </div>
                        </div>

                        <div className="tb-gauge" aria-hidden="true">
                            <span className="tb-gauge-fill" style={{ width: `${acceptRate}%` }} />
                        </div>
                    </div>
                </div>

                <p className="tb-hint">
                    <b>자동 트래픽</b>이 <b>충전 속도</b>보다 빠르면 버킷이 마르며 429가 쌓입니다.
                    <b> 폭주 ×12</b>를 눌러 순간 몰림을 보내보세요 — 용량만큼만 통과하고 나머지는 잘립니다.
                </p>

                <div className="k-resize"></div>
            </section>

            <section className="k-win tb-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="tb-foot">
                    <p>
                        {'요청을 받는 쪽의 처리 능력은 유한하다. 짧은 시간에 요청이 몰리면 뒤쪽 서비스가 무너지고, '}
                        {'그 피해는 폭주를 일으킨 소수가 아니라 '}<b>모두에게</b>{' 돌아간다. 그래서 대부분의 관문에는 '}
                        <b>속도 제한기(rate limiter)</b>{'가 놓인다.'}
                    </p>
                    <p>
                        {'가장 널리 쓰이는 방식이 '}<b>토큰 버킷</b>{'이다. 버킷에는 토큰이 초당 일정 속도로 채워지고, '}
                        {'요청은 토큰을 하나 써야 통과한다. 덕분에 '}<b>평균 처리율은 충전 속도로 묶이면서도</b>{', '}
                        {'버킷에 쌓아둔 만큼의 '}<b>순간 폭주는 너그럽게 허용</b>{'된다 — 무 자르듯 막기만 하는 고정 창(fixed window)보다 부드럽다.'}
                    </p>
                    <p>
                        {'자동화된 호출자가 폭증하는 시대에 이 장치의 존재감은 더 커졌다. 응답으로 돌아오는 '}
                        <b>429 Too Many Requests</b>{'는 "지금은 잠깐 쉬었다 오라"는 신호이고, 잘 만든 호출자는 '}
                        {'그 신호를 읽어 스스로 속도를 늦춘다(backoff). 제한은 벽이 아니라 '}<b>서로를 지키는 약속</b>{'에 가깝다.'}
                    </p>
                    <p className="tb-disclaimer">
                        {'* 토큰 버킷의 핵심(용량·충전·소비·거절)을 실시간으로 보여주는 결정적 데모입니다. 실제 분산 환경의 '}
                        {'슬라이딩 윈도우·분산 카운터·지터 백오프 등은 단순화했습니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Throttle;
