import React, { useMemo, useState, useCallback, useRef } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/ConsistentHash.css';

// CONSISTENT HASH — 일관성 해싱(해시 링) 실험.
// 핵심: 노드와 키를 같은 원(해시 링) 위에 올린다. 키는 링을 시계 방향으로 돌다
// 처음 만나는 노드가 소유한다. 그래서 노드가 추가·제거돼도 그 근처의 키만 주인이
// 바뀌고 나머지는 그대로다 — 노드 수로 나머지 연산을 하는 소박한 hash % N 방식이
// 노드 수가 바뀔 때마다 거의 모든 키를 옮겨 캐시를 통째로 날리는 것과 대비된다.

const TAU = Math.PI * 2;
const CX = 180;
const CY = 180;
const R = 128; // 링 반지름

// 노드 색 팔레트 — 진부한 보라 그라데이션 대신 구분 잘 되는 카테고리 색만.
const PALETTE = ['#2D4FFF', '#12894E', '#C8402F', '#B8860B', '#0E7C86', '#C25E00', '#8A1C5A', '#5B6470'];

// FNV-1a 32bit + murmur3 비트 믹서 → [0,1) 링 위치.
// 믹서가 없으면 'node-A#0','node-A#1'처럼 접두사가 같은 짧은 문자열의 해시가
// 상위 비트에 뭉쳐(클러스터) 한 노드가 링을 통째로 차지해 버린다 — 믹서로 눈사태(avalanche)를 준다.
const hashStr = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
};
const posOf = (s) => hashStr(s) / 0x100000000;

// 노드×가상노드를 링 위 점으로 펼쳐 정렬
const buildRing = (nodes, vnodes) => {
    const points = [];
    nodes.forEach((n) => {
        for (let i = 0; i < vnodes; i++) points.push({ nodeId: n.id, pos: posOf(`${n.name}#${i}`) });
    });
    points.sort((a, b) => a.pos - b.pos);
    return points;
};

// 링을 시계 방향으로 돌아 처음 만나는 점(노드)이 소유자
const ownerOfPos = (points, pos) => {
    if (points.length === 0) return null;
    for (let i = 0; i < points.length; i++) if (points[i].pos >= pos) return points[i].nodeId;
    return points[0].nodeId; // 한 바퀴 넘어가면 첫 점으로 감김
};

const consistentOwners = (nodes, vnodes, keys) => {
    const points = buildRing(nodes, vnodes);
    const m = new Map();
    keys.forEach((k) => m.set(k.id, ownerOfPos(points, k.pos)));
    return m;
};

// 소박한 hash % N — 노드를 index로 고르므로 노드 수가 바뀌면 거의 다 옮겨진다
const naiveOwners = (nodes, keys) => {
    const sorted = [...nodes].sort((a, b) => a.id - b.id);
    const n = sorted.length;
    const m = new Map();
    keys.forEach((k) => m.set(k.id, n ? sorted[Math.floor(k.pos * 1e9) % n].id : null));
    return m;
};

// 링 위 좌표 / 호(arc) 경로
const ptAt = (pos, r) => {
    const a = pos * TAU - Math.PI / 2;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
const arcPath = (p0, p1, r) => {
    const [x0, y0] = ptAt(p0, r);
    const [x1, y1] = ptAt(p1, r);
    const span = ((p1 - p0) % 1 + 1) % 1;
    const large = span > 0.5 ? 1 : 0;
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const makeNode = (id, idx) => ({ id, name: `node-${LETTERS[idx % LETTERS.length]}`, color: PALETTE[idx % PALETTE.length] });

const rndKey = () => {
    const s = Math.floor(Math.random() * 0xfffff).toString(36).padStart(4, '0');
    return `key:${s}`;
};

const ConsistentHash = () => {
    const nodeSeq = useRef(3);
    const keySeq = useRef(0);
    const [nodes, setNodes] = useState(() => [makeNode(0, 0), makeNode(1, 1), makeNode(2, 2)]);
    const [vnodes, setVnodes] = useState(4);
    const [keys, setKeys] = useState(() =>
        Array.from({ length: 14 }, () => {
            const label = rndKey();
            return { id: keySeq.current++, label, pos: posOf(label) };
        }),
    );
    // 마지막 위상 변화의 결과(옮겨진 키 수 비교 + 강조 대상)
    const [change, setChange] = useState(null);

    const colorOf = useMemo(() => {
        const m = new Map();
        nodes.forEach((n) => m.set(n.id, n.color));
        return m;
    }, [nodes]);

    // 현재 위상의 링 기하 + 소유자 + 노드별 부하
    const view = useMemo(() => {
        const points = buildRing(nodes, vnodes);
        const owners = new Map();
        keys.forEach((k) => owners.set(k.id, ownerOfPos(points, k.pos)));
        const arcs = points.map((p, i) => {
            const next = points[(i + 1) % points.length];
            const owner = next.nodeId; // 시계 방향 다음 점이 그 구간의 주인
            return { key: `${p.nodeId}:${p.pos}`, d: arcPath(p.pos, i === points.length - 1 ? next.pos + 1 : next.pos, R), color: colorOf.get(owner) };
        });
        const load = new Map(nodes.map((n) => [n.id, 0]));
        owners.forEach((nid) => load.set(nid, (load.get(nid) || 0) + 1));
        return { points, owners, arcs, load };
    }, [nodes, vnodes, keys, colorOf]);

    // 위상을 바꾸며 두 방식의 이동량을 즉석에서 측정
    const applyTopology = useCallback(
        (nextNodes, type) => {
            const beforeC = consistentOwners(nodes, vnodes, keys);
            const beforeN = naiveOwners(nodes, keys);
            const afterC = consistentOwners(nextNodes, vnodes, keys);
            const afterN = naiveOwners(nextNodes, keys);
            const movedIds = new Set();
            let cMoved = 0;
            let nMoved = 0;
            keys.forEach((k) => {
                if (beforeC.get(k.id) !== afterC.get(k.id)) { cMoved++; movedIds.add(k.id); }
                if (beforeN.get(k.id) !== afterN.get(k.id)) nMoved++;
            });
            setNodes(nextNodes);
            setChange({ type, cMoved, nMoved, total: keys.length, movedIds });
        },
        [nodes, vnodes, keys],
    );

    const addNode = useCallback(() => {
        if (nodes.length >= 8) return;
        const idx = nodeSeq.current++;
        applyTopology([...nodes, makeNode(idx, nodes.length)], 'add');
    }, [nodes, applyTopology]);

    const removeNode = useCallback(
        (id) => {
            if (nodes.length <= 1) return;
            applyTopology(nodes.filter((n) => n.id !== id), 'remove');
        },
        [nodes, applyTopology],
    );

    const addKeys = useCallback((count) => {
        setKeys((prev) => {
            const next = [...prev];
            for (let i = 0; i < count; i++) {
                const label = rndKey();
                next.push({ id: keySeq.current++, label, pos: posOf(label) });
            }
            return next.slice(-64);
        });
        setChange(null);
    }, []);

    const clearKeys = useCallback(() => { setKeys([]); setChange(null); }, []);

    const reset = useCallback(() => {
        nodeSeq.current = 3;
        setNodes([makeNode(0, 0), makeNode(1, 1), makeNode(2, 2)]);
        setVnodes(4);
        setChange(null);
    }, []);

    const total = keys.length;
    const ideal = nodes.length ? total / nodes.length : 0;
    const maxLoad = Math.max(1, ...nodes.map((n) => view.load.get(n.id) || 0));

    return (
        <LabShell
            title="CONSISTENT HASH"
            eyebrow="distributed systems"
            subtitle={'// 노드가 드나들어도 몇몇 키만 옮겨지는 해시 링 — 캐시를 통째로 날리지 않는다'}
            path="consistent-hash.exe"
        >
            <section className="k-win ch-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/ring/</span>hash-ring</span>
                    <span className="meta k-mono">consistent hashing</span>
                </div>

                <div className="ch-toolbar">
                    <div className="ch-ctrl">
                        <label className="ch-ctrl-label k-mono" htmlFor="ch-vnode">가상 노드 <b>{vnodes}</b>/노드</label>
                        <input id="ch-vnode" type="range" min="1" max="16" step="1"
                            value={vnodes} onChange={(e) => { setVnodes(Number(e.target.value)); setChange(null); }} />
                    </div>
                    <div className="ch-actions">
                        <button type="button" className="ch-btn" onClick={addNode} disabled={nodes.length >= 8}>＋ 노드 추가</button>
                        <button type="button" className="ch-btn ch-btn-ghost" onClick={() => addKeys(6)}>＋ 키 6개</button>
                        <button type="button" className="ch-btn ch-btn-ghost" onClick={clearKeys}>키 비움</button>
                        <button type="button" className="ch-btn ch-btn-ghost" onClick={reset}>리셋</button>
                    </div>
                </div>

                <div className="ch-stage">
                    <div className="ch-ring-col">
                        <svg className="ch-ring" viewBox="0 0 360 360" role="img"
                            aria-label={`해시 링: 노드 ${nodes.length}개, 키 ${total}개`}>
                            <circle className="ch-track" cx={CX} cy={CY} r={R} />
                            {view.arcs.map((a) => (
                                <path key={a.key} className="ch-arc" d={a.d} stroke={a.color} />
                            ))}
                            {view.points.map((p) => {
                                const [x, y] = ptAt(p.pos, R);
                                return <circle key={`${p.nodeId}:${p.pos}`} className="ch-vnode" cx={x} cy={y} r={4} fill={colorOf.get(p.nodeId)} />;
                            })}
                            {keys.map((k) => {
                                const [x, y] = ptAt(k.pos, R);
                                const moved = change && change.movedIds.has(k.id);
                                return (
                                    <circle key={k.id} className={`ch-key ${moved ? 'is-moved' : ''}`}
                                        cx={x} cy={y} r={moved ? 4.5 : 2.6} fill={colorOf.get(view.owners.get(k.id)) || 'var(--ink-mute)'} />
                                );
                            })}
                            <text className="ch-ring-cap k-mono" x={CX} y={CY - 6} textAnchor="middle">{total}</text>
                            <text className="ch-ring-sub k-mono" x={CX} y={CY + 12} textAnchor="middle">keys</text>
                        </svg>
                        <p className="ch-ring-foot k-mono">
                            굵은 호 = 각 노드가 맡은 링 구간 · 작은 점 = 가상 노드 · 링 위 점 = 키
                        </p>
                    </div>

                    <div className="ch-right">
                        <div className="ch-panel">
                            <div className="ch-panel-head k-mono">
                                <span>노드 부하</span>
                                <span className="ch-ideal">이상값 {ideal ? ideal.toFixed(1) : 0}/노드</span>
                            </div>
                            <ul className="ch-nodes">
                                {nodes.map((n) => {
                                    const l = view.load.get(n.id) || 0;
                                    return (
                                        <li key={n.id} className="ch-node">
                                            <span className="ch-swatch" style={{ background: n.color }} />
                                            <span className="ch-node-name k-mono">{n.name}</span>
                                            <span className="ch-bar"><span className="ch-bar-fill" style={{ width: `${(l / maxLoad) * 100}%`, background: n.color }} /></span>
                                            <span className="ch-node-load k-mono">{l}</span>
                                            <button type="button" className="ch-x" onClick={() => removeNode(n.id)}
                                                disabled={nodes.length <= 1} aria-label={`${n.name} 제거`}>✕</button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div className="ch-panel">
                            <div className="ch-panel-head k-mono">
                                <span>마지막 위상 변화</span>
                                {change && <span className="ch-ideal">{change.type === 'add' ? '노드 추가' : '노드 제거'}</span>}
                            </div>
                            {change ? (
                                <div className="ch-compare">
                                    <div className="ch-cmp ch-cmp-good">
                                        <span className="ch-cmp-lab k-mono">일관성 해싱</span>
                                        <span className="ch-cmp-num k-mono">{change.cMoved}</span>
                                        <span className="ch-cmp-pct k-mono">
                                            {change.total ? Math.round((change.cMoved / change.total) * 100) : 0}% 이동
                                        </span>
                                    </div>
                                    <div className="ch-cmp ch-cmp-bad">
                                        <span className="ch-cmp-lab k-mono">hash % N (소박)</span>
                                        <span className="ch-cmp-num k-mono">{change.nMoved}</span>
                                        <span className="ch-cmp-pct k-mono">
                                            {change.total ? Math.round((change.nMoved / change.total) * 100) : 0}% 이동
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="ch-empty k-mono">노드를 추가하거나 제거해 두 방식의 키 이동량을 비교해 보세요.</p>
                            )}
                        </div>
                    </div>
                </div>

                <p className="ch-hint">
                    <b>가상 노드</b>를 늘릴수록 각 노드의 링 구간이 잘게 흩어져 <b>부하가 고르게</b> 나뉩니다.
                    <b> 노드 추가</b>를 눌러 보세요 — 일관성 해싱은 새 노드 근처의 키만 옮기지만,
                    <b> hash % N</b>은 노드 수가 바뀌는 순간 거의 모든 키가 재배치됩니다.
                </p>

                <div className="k-resize"></div>
            </section>

            <section className="k-win ch-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="ch-foot">
                    <p>
                        {'캐시 서버나 샤드가 여러 대일 때, 어떤 키를 어느 서버로 보낼지는 보통 '}
                        <b>hash(key) % N</b>{'으로 정한다. 간단하지만 치명적인 약점이 있다 — 서버를 한 대 '}
                        {'늘리거나 줄여 '}<b>N</b>{'이 바뀌는 순간, 나머지 연산의 결과가 통째로 어긋나며 '}
                        <b>거의 모든 키가 다른 서버로 재배치</b>{'된다. 캐시가 한꺼번에 비워지고, 뒤쪽 저장소로 '}
                        {'요청이 쏟아지는 캐시 스탬피드가 일어난다.'}
                    </p>
                    <p>
                        <b>{'일관성 해싱(consistent hashing)'}</b>{'은 노드와 키를 같은 원 — '}<b>해시 링</b>{' — '}
                        {'위에 올린다. 키는 링을 시계 방향으로 돌다 처음 만나는 노드가 맡는다. 노드가 하나 '}
                        {'사라지면 그 노드가 맡던 키만 다음 노드로 넘어가고, 노드가 하나 생기면 그 자리 '}
                        {'근처의 키만 새 노드로 옮겨온다. 평균적으로 옮겨지는 키는 '}<b>1/N 남짓</b>{'뿐이다.'}
                    </p>
                    <p>
                        {'다만 노드가 적으면 링 위 위치가 뭉쳐 부하가 한쪽으로 쏠린다. 그래서 실제 시스템은 '}
                        {'노드 하나를 링 위 여러 지점에 '}<b>가상 노드(virtual node)</b>{'로 복제해 흩뿌린다 — '}
                        {'슬라이더를 올리면 색 구간이 잘게 섞이며 부하가 평평해지는 걸 볼 수 있다. CDN·분산 '}
                        {'캐시·샤딩 데이터베이스가 노드를 넣고 빼면서도 흔들리지 않는 비결이 이 원 하나에 있다.'}
                    </p>
                    <p className="ch-disclaimer">
                        {'* 링 위치·소유·가상 노드·재배치 비교의 핵심만 결정적으로 보여주는 데모입니다. 실제 구현의 '}
                        {'가중치 링·복제본 배치·해시 충돌 처리 등은 단순화했습니다.'}
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default ConsistentHash;
