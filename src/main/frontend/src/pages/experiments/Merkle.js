import React, { useCallback, useMemo, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Merkle.css';

// MERKLE — 변조 감지 해시 트리 실험 (딥페이크·생성콘텐츠 시대의 "무결성 증명").
// 핵심: 데이터를 블록으로 쪼개 각 블록을 해시하고, 짝을 지어 위로 또 해시하면
//   맨 위에 하나의 "루트 해시"가 남는다. 블록 하나만 바꿔도 그 변화가
//   경로를 따라 루트까지 번져 루트 해시가 달라진다 → 봉인해 둔 루트와 비교하면 변조가 들통난다.
//   게다가 어떤 블록이 진짜인지는 전체가 아니라 log2(N)개의 해시만으로 증명된다(머클 증명).
//   git·블록체인·콘텐츠 출처증명이 모두 이 구조에 기댄다.

const LEAF_N = 8;               // 리프(블록) 수 → 트리 깊이 3
const VB_W = 720, VB_H = 430;   // SVG 논리 좌표
const NW = 62, NH = 30;         // 노드 박스
const LVL_Y = [46, 140, 234, 322]; // l0(루트) ~ l3(리프) 중심 y
const BLK_Y = 388, BLK_W = 46, BLK_H = 34; // 데이터 블록 타일

const nodeX = (l, i) => (VB_W * (i + 0.5)) / (2 ** l);

// 슬롯 위치는 고정(재배열·삽입·삭제 없음)이라 위치별 안정 키를 미리 만든다.
const LEAF_IDS = Array.from({ length: LEAF_N }, (_, i) => 'slot' + i);

// 32비트 FNV-1a — 암호용이 아닌 데모용 결정적 해시.
const fnv = (str) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
};
const leafHash = (byte) => fnv('L' + byte);
const nodeHash = (a, b) => fnv(a.toString(16) + ':' + b.toString(16));
const hex4 = (h) => (h >>> 0).toString(16).padStart(8, '0').slice(-4);
const hex2 = (b) => b.toString(16).padStart(2, '0');

// blocks(바이트 배열) → 레벨별 해시. levels[0]=[루트], levels[3]=리프 8개.
function buildTree(blocks) {
    const levels = [];
    let cur = blocks.map(leafHash);
    levels[3] = cur;
    for (let l = 2; l >= 0; l--) {
        const next = [];
        for (let i = 0; i < cur.length; i += 2) next.push(nodeHash(cur[i], cur[i + 1]));
        levels[l] = next;
        cur = next;
    }
    return levels;
}

const randByte = (avoid) => {
    let v;
    do { v = Math.floor(Math.random() * 256); } while (v === avoid);
    return v;
};

const Merkle = () => {
    const [blocks, setBlocks] = useState(() => Array.from({ length: LEAF_N }, () => Math.floor(Math.random() * 256)));
    const [sealed, setSealed] = useState(null);   // 봉인된 트리(레벨별 해시 스냅샷)
    const [mode, setMode] = useState('edit');     // 'edit' | 'audit'
    const [revealed, setRevealed] = useState(new Set()); // 감사 모드에서 열어 본 노드 id
    const [checks, setChecks] = useState(0);
    const [found, setFound] = useState(false);

    const levels = useMemo(() => buildTree(blocks), [blocks]);

    const matches = useCallback(
        (l, i) => (sealed ? levels[l][i] === sealed[l][i] : true),
        [levels, sealed],
    );

    const rootMatch = sealed ? levels[0][0] === sealed[0][0] : null;
    const diffLeaves = sealed ? levels[3].reduce((n, h, i) => n + (h !== sealed[3][i] ? 1 : 0), 0) : 0;

    // ---- 편집 모드 ----
    const editBlock = (i) => {
        if (mode !== 'edit') return;
        setBlocks((prev) => {
            const next = [...prev];
            next[i] = randByte(next[i]);
            return next;
        });
    };
    const seal = () => setSealed(levels.map((a) => a.slice()));
    const resetAll = () => {
        setBlocks(Array.from({ length: LEAF_N }, () => Math.floor(Math.random() * 256)));
        setSealed(null);
        setRevealed(new Set());
        setChecks(0);
        setFound(false);
    };

    // ---- 감사(mini-game) 모드 ----
    // 현재 상태를 봉인한 뒤, 몰래 블록 하나를 바꿔 "숨은 변조"를 만든다.
    const startAudit = useCallback(() => {
        const base = buildTree(blocks);
        setSealed(base.map((a) => a.slice()));
        const idx = Math.floor(Math.random() * LEAF_N);
        setBlocks((prev) => {
            const next = [...prev];
            next[idx] = randByte(next[idx]);
            return next;
        });
        setRevealed(new Set());
        setChecks(0);
        setFound(false);
    }, [blocks]);

    const enterMode = (m) => {
        if (m === mode) return;
        setMode(m);
        if (m === 'audit') startAudit();
        else { setRevealed(new Set()); setChecks(0); setFound(false); }
    };

    const revealNode = (l, i) => {
        if (mode !== 'audit' || found || !sealed) return;
        const id = l + '-' + i;
        if (revealed.has(id)) return;
        const nr = new Set(revealed);
        nr.add(id);
        setRevealed(nr);
        setChecks(nr.size);
        if (l === 3 && levels[3][i] !== sealed[3][i]) setFound(true); // 변조된 리프를 짚어냄
    };

    // 노드 상태 클래스 계산
    const nodeState = (l, i) => {
        if (mode === 'audit') {
            if (!revealed.has(l + '-' + i)) return 'hidden';
            return matches(l, i) ? 'ok' : 'bad';
        }
        // edit
        if (!sealed) return 'plain';
        return matches(l, i) ? 'ok' : 'bad';
    };

    // 간선(부모→자식) 목록
    const edges = [];
    for (let l = 1; l <= 3; l++) {
        const count = 2 ** l;
        for (let i = 0; i < count; i++) {
            const pi = i >> 1;
            const bad = mode === 'edit' && sealed && !matches(l, i); // 변조 전파 경로 강조
            edges.push({
                x1: nodeX(l - 1, pi), y1: LVL_Y[l - 1] + NH / 2,
                x2: nodeX(l, i), y2: LVL_Y[l] - NH / 2,
                bad, key: `e${l}-${i}`,
            });
        }
    }

    const nodes = [];
    for (let l = 0; l <= 3; l++) {
        const count = 2 ** l;
        for (let i = 0; i < count; i++) {
            const cx = nodeX(l, i), cy = LVL_Y[l];
            const st = nodeState(l, i);
            const isRoot = l === 0;
            const clickable = mode === 'audit' && !found && st === 'hidden';
            nodes.push({ l, i, cx, cy, st, isRoot, clickable, hash: hex4(levels[l][i]), key: `n${l}-${i}` });
        }
    }

    const logN = Math.log2(LEAF_N); // 3

    return (
        <LabShell
            title="MERKLE"
            eyebrow="tamper-evidence · hash tree"
            subtitle={'// 블록 하나만 바뀌어도 루트 해시가 달라진다 — 무결성을 하나의 해시로 봉인'}
            path="merkle.exe"
        >
            <section className="k-win mk-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/tree/</span>root</span>
                    <span className="meta k-mono">hash(leaf) → hash(pair) → … → root</span>
                </div>

                <div className="mk-toolbar">
                    <div className="mk-modes">
                        <button type="button" className={`mk-seg ${mode === 'edit' ? 'is-on' : ''}`} onClick={() => enterMode('edit')}>
                            편집
                        </button>
                        <button type="button" className={`mk-seg ${mode === 'audit' ? 'is-on' : ''}`} onClick={() => enterMode('audit')}>
                            감사 게임
                        </button>
                    </div>

                    <div className="mk-actions">
                        {mode === 'edit' ? (
                            <>
                                <button type="button" className={`mk-btn ${sealed ? 'is-on' : ''}`} onClick={seal}>
                                    {sealed ? '✓ 다시 봉인' : '🔒 봉인 (Seal)'}
                                </button>
                                <button type="button" className="mk-btn mk-btn-ghost" onClick={resetAll}>↻ 리셋</button>
                            </>
                        ) : (
                            <button type="button" className="mk-btn mk-btn-ghost" onClick={startAudit}>🎲 새 변조 문제</button>
                        )}
                    </div>
                </div>

                <div className="mk-stage">
                    <div className="mk-screen-col">
                        <div className="mk-screen">
                            <svg className="mk-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet">
                                {edges.map((e) => (
                                    <line key={e.key} className={`mk-edge ${e.bad ? 'is-bad' : ''}`}
                                        x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
                                ))}

                                {/* 리프 → 데이터 블록 연결선 */}
                                {LEAF_IDS.map((id, i) => (
                                    <line key={id} className="mk-edge"
                                        x1={nodeX(3, i)} y1={LVL_Y[3] + NH / 2}
                                        x2={nodeX(3, i)} y2={BLK_Y - BLK_H / 2} />
                                ))}

                                {/* 노드 */}
                                {nodes.map((n) => (
                                    <g key={n.key}
                                        className={`mk-node is-${n.st} ${n.isRoot ? 'is-root' : ''} ${n.clickable ? 'is-click' : ''}`}
                                        onClick={() => revealNode(n.l, n.i)}>
                                        <rect x={n.cx - NW / 2} y={n.cy - NH / 2} width={NW} height={NH} rx="3" />
                                        <text x={n.cx} y={n.cy + 4} className="mk-node-tx k-mono">
                                            {n.st === 'hidden' ? '····' : n.hash}
                                        </text>
                                        {n.st === 'bad' && <text x={n.cx + NW / 2 - 8} y={n.cy - NH / 2 + 11} className="mk-mark k-mono">✗</text>}
                                        {n.st === 'ok' && sealed && <text x={n.cx + NW / 2 - 8} y={n.cy - NH / 2 + 11} className="mk-mark mk-mark-ok k-mono">✓</text>}
                                    </g>
                                ))}

                                {/* 데이터 블록 타일 */}
                                {LEAF_IDS.map((id, i) => {
                                    const b = blocks[i];
                                    const tampered = mode === 'edit' && sealed && levels[3][i] !== sealed[3][i];
                                    return (
                                        <g key={id}
                                            className={`mk-blk ${mode === 'edit' ? 'is-edit' : ''} ${tampered ? 'is-bad' : ''}`}
                                            onClick={() => editBlock(i)}>
                                            <rect x={nodeX(3, i) - BLK_W / 2} y={BLK_Y - BLK_H / 2} width={BLK_W} height={BLK_H} rx="3" />
                                            <text x={nodeX(3, i)} y={BLK_Y - 2} className="mk-blk-tx k-mono">{hex2(b)}</text>
                                            <text x={nodeX(3, i)} y={BLK_Y + 11} className="mk-blk-ix k-mono">#{i}</text>
                                        </g>
                                    );
                                })}
                            </svg>

                            <span className={`mk-modechip k-mono ${mode === 'edit' ? 'is-edit' : 'is-audit'}`}>
                                {mode === 'edit' ? 'EDIT' : 'AUDIT'}
                            </span>
                        </div>

                        <div className="mk-legend k-mono">
                            {mode === 'edit' ? (
                                <>
                                    <span><i className="mk-key mk-key-blk" /> 블록 클릭 → 값 변경</span>
                                    <span><i className="mk-key mk-key-bad" /> 봉인과 다름(변조 경로)</span>
                                    <span><i className="mk-key mk-key-ok" /> 봉인과 일치</span>
                                </>
                            ) : (
                                <>
                                    <span><i className="mk-key mk-key-hidden" /> 미확인(클릭해 대조)</span>
                                    <span><i className="mk-key mk-key-ok" /> 봉인과 일치 ✓</span>
                                    <span><i className="mk-key mk-key-bad" /> 봉인과 불일치 ✗</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mk-right">
                        {mode === 'edit' ? (
                            <>
                                <div className="mk-stats">
                                    <div className={`mk-stat mk-stat-hero ${sealed ? (rootMatch ? 'is-ok' : 'is-bad') : ''}`}>
                                        <span className="mk-stat-lab k-mono">루트 해시 (LIVE)</span>
                                        <span className="mk-stat-num k-mono">{hex4(levels[0][0])}</span>
                                        <span className="mk-stat-sub k-mono">
                                            {sealed ? (rootMatch ? 'VERIFIED · 봉인과 일치' : 'TAMPERED · 봉인과 불일치') : '미봉인 — 먼저 봉인하세요'}
                                        </span>
                                    </div>
                                    <div className="mk-stat">
                                        <span className="mk-stat-lab k-mono">봉인된 루트</span>
                                        <span className="mk-stat-num sm k-mono">{sealed ? hex4(sealed[0][0]) : '—'}</span>
                                        <span className="mk-stat-sub k-mono">sealed root</span>
                                    </div>
                                    <div className="mk-stat">
                                        <span className="mk-stat-lab k-mono">바뀐 블록</span>
                                        <span className="mk-stat-num sm k-mono">{sealed ? diffLeaves : '—'}</span>
                                        <span className="mk-stat-sub k-mono">개 / {LEAF_N}</span>
                                    </div>
                                </div>
                                <div className={`mk-verdict ${sealed ? (rootMatch ? 'is-ok' : 'is-bad') : ''}`}>
                                    <p className="mk-verdict-txt">
                                        {!sealed
                                            ? <>블록을 클릭해 내용을 바꿔 보고, <b>🔒 봉인</b>으로 지금의 루트 해시를 도장 찍으세요. 이후엔 이 하나의 해시가 전체 무결성을 증명합니다.</>
                                            : rootMatch
                                                ? <>봉인된 루트와 <b>일치</b>합니다. 아직 어떤 블록도 손대지 않았어요. 블록 하나를 클릭해 바꿔 보세요.</>
                                                : <>블록 하나가 바뀌자 그 변화가 <b>경로를 따라 루트까지</b> 번져 루트 해시가 달라졌습니다. 원본 전체를 몰라도, 봉인해 둔 <b>루트 해시 하나</b>만으로 변조를 잡아냅니다.</>}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mk-stats">
                                    <div className={`mk-stat mk-stat-hero ${found ? 'is-ok' : 'is-audit'}`}>
                                        <span className="mk-stat-lab k-mono">확인한 해시</span>
                                        <span className="mk-stat-num k-mono">{checks}</span>
                                        <span className="mk-stat-sub k-mono">{found ? `찾았다! ≤ ${logN}번이면 충분` : '루트부터 붉은 쪽으로'}</span>
                                    </div>
                                    <div className="mk-stat">
                                        <span className="mk-stat-lab k-mono">머클 증명</span>
                                        <span className="mk-stat-num sm k-mono">log₂{LEAF_N}={logN}</span>
                                        <span className="mk-stat-sub k-mono">최대 확인 수</span>
                                    </div>
                                    <div className="mk-stat">
                                        <span className="mk-stat-lab k-mono">선형 스캔</span>
                                        <span className="mk-stat-num sm k-mono">{LEAF_N}</span>
                                        <span className="mk-stat-sub k-mono">블록 하나씩</span>
                                    </div>
                                </div>
                                <div className={`mk-verdict ${found ? 'is-ok' : 'is-audit'}`}>
                                    <p className="mk-verdict-txt">
                                        {found
                                            ? <>변조된 블록을 <b>{checks}번</b>의 해시 비교로 짚어냈습니다. 블록이 {LEAF_N}개든 백만 개든, 붉은 자식만 따라 내려가면 <b>log₂(N)</b>번이면 끝 — 이게 머클 증명의 힘입니다.</>
                                            : <>블록 하나가 <b>몰래 변조</b>됐습니다. 원본은 감춰져 있어요. <b>루트부터</b> 노드를 클릭해 봉인과 대조하고, <b>✗(불일치)</b>가 뜬 자식만 따라 내려가 변조된 리프를 짚어 보세요.</>}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="k-resize"></div>
            </section>

            <section className="k-win mk-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="mk-foot">
                    <p>
                        {'딥페이크와 AI 생성 콘텐츠가 범람하면서 "이 파일·이미지·기록이 '}<b>{'조작되지 않았음'}</b>
                        {'을 어떻게 증명하는가"가 큰 물음이 됐다. 이 실험은 특정 사건이 아니라 그 밑바탕의 보편 구조 — '}
                        <b>{'머클 트리(해시 트리)'}</b>{' — 를 소재로 삼는다.'}
                    </p>
                    <p>
                        {'방법은 단순하다. 데이터를 여러 '}<b>{'블록'}</b>{'으로 쪼개 각 블록을 해시하고(리프), 이웃한 해시를 '}
                        {'짝지어 다시 해시한다. 이 과정을 반복하면 맨 위에 '}<b>{'루트 해시'}</b>{' 하나가 남는다. 이 루트는 '}
                        {'아래 모든 블록에 의존하므로, 블록 하나의 비트 하나만 바뀌어도 그 변화가 '}<b>{'부모를 따라 루트까지'}</b>
                        {' 전파돼 루트 해시가 완전히 달라진다. 그래서 루트 해시 하나만 안전하게 봉인해 두면, 나중에 데이터를 '}
                        {'다시 해싱해 봉인값과 비교하는 것만으로 변조 여부를 알 수 있다.'}
                    </p>
                    <p>
                        {'더 놀라운 건 '}<b>{'효율'}</b>{'이다. 특정 블록이 진짜임을 증명하는 데 전체 데이터가 필요 없다. '}
                        {'그 블록에서 루트까지 이어지는 '}<b>{'형제 해시 log₂(N)개'}</b>{'만 있으면 된다(머클 증명). '}
                        {'감사 게임에서 확인해 보라 — 블록 '}{LEAF_N}{'개 중 하나가 변조돼도, 루트부터 불일치한 자식만 따라 내려가면 '}
                        <b>{'세 번'}</b>{'의 해시 비교로 범인을 짚는다. 블록을 하나씩 다 열어보는 것(최대 '}{LEAF_N}{'번)보다 훨씬 적다.'}
                    </p>
                    <p className="mk-disclaimer">
                        {'* git 커밋, 블록체인, 콘텐츠 출처증명(provenance), P2P 파일 검증이 모두 이 구조에 기댄다. '}
                        {'이 데모는 이해를 돕기 위해 짧은 비암호 해시(FNV-1a)를 쓰며 값은 4자리로 축약해 보여준다 — '}
                        {'실제 시스템은 SHA-256 같은 충돌 저항 해시를 쓴다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Merkle;
