import React, { useCallback, useEffect, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Fovea.css';

// FOVEA — 시선이 닿는 곳만 글자가 된다 (몸 × 아트 토이 × 타이포그래피 인터랙션 × 텍스트보다 도형).
//   소재: 몸 — 중심와(fovea). 우리는 한 페이지를 다 본다고 착각하지만, 또렷하게 읽히는 건
//         시선이 꽂히는 아주 좁은 한 점뿐이다. 그 밖은 형태로만 어렴풋이 남는다(주변시).
//   형식: 아트 토이 — 목적도 점수도 없다. 시선(포인터)을 옮기면 글자가 결정(結晶)됐다 다시 흩어진다.
//   기술: 타이포그래피가 인터랙션 — 글자 자체가 조작 대상. 시선에서 멀어질수록 글자는 도형으로
//         뭉개지고(점·막대·네모), 가까워지면 다시 글자로 맺힌다. 캔버스도 rAF 물리도 아니다.
//   제약: 텍스트보다 도형이 많아야 — 어느 순간에도 실제 글자로 읽히는 칸은 시선 둘레 수십 칸뿐.
//         화면 대부분은 늘 형태(도형)다.
//
//   도전: 촘촘한 타이포 격자를 시선 위치에 따라 60fps로 글자↔도형 크로스페이드하면서,
//         한번 초점이 닿은 칸은 잠깐 더 또렷하게 남았다 서서히 흐려지는 "잔상(시각 지속)"까지
//         얹을 수 있느냐. 결국 "이 문장을 한 번에 다 본다"는 착각을 손끝으로 깨뜨릴 수 있느냐.

// 필드를 채우는 문구 — 시선을 옮겨야만 한 조각씩 읽힌다(스스로를 설명하는 문장).
const SOURCE =
    '당신은 지금 이 문장을 한 번에 다 본다고 느끼지만 또렷하게 읽히는 건 시선이 닿는 아주 좁은 한 점뿐이고 나머지는 형태로만 어렴풋이 남는다 눈을 옮겨야 비로소 글자가 된다 ';

const CELL = 34;   // 칸 한 변(px)
const LEVELS = 6;  // 선명도 단계 0..6
const R_FOVEA = 44;   // 중심와 반경 — 이 안은 완전한 글자
const R_EDGE = 220;   // 이 밖은 형태만

const Fovea = () => {
    const stageRef = useRef(null);
    const nodesRef = useRef([]);     // 칸 DOM 노드
    const baseRef = useRef([]);      // 칸 기본 className
    const centerRef = useRef([]);    // 칸 중심 좌표 {x,y}
    const spaceRef = useRef([]);     // 공백 칸 여부
    const memRef = useRef([]);       // 칸별 선명도(잔상 포함) 0..LEVELS
    const lvlRef = useRef([]);       // 마지막 적용 단계
    const gazeRef = useRef({ x: -9999, y: -9999, on: false });
    const reticleRef = useRef(null);
    const rafRef = useRef(0);
    const movedRef = useRef(false);

    const [cells, setCells] = useState([]);
    const [moved, setMoved] = useState(false);

    // 격자 만들기 — 무대 크기를 재서 칸 배치.
    const build = useCallback(() => {
        const el = stageRef.current;
        if (!el) return;
        const w = el.clientWidth;
        const h = el.clientHeight;
        const cols = Math.max(6, Math.floor(w / CELL));
        const rows = Math.max(6, Math.floor(h / CELL));
        // 격자는 무대 좌상단(0,0)부터 flex-wrap으로 깔린다 — 중심 좌표도 같은 기준으로 잡아 맞춘다.
        const offX = 0;
        const offY = 0;

        const list = [];
        const centers = [];
        const spaces = [];
        const bases = [];
        let si = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const ch = SOURCE[si % SOURCE.length];
                si++;
                const isSpace = ch === ' ';
                // 형태 종류(원/네모/막대)는 칸마다 고정 — 주변부가 다양한 인쇄 얼룩처럼 보이도록.
                const shape = (r * 7 + c * 3 + si) % 3;
                spaces.push(isSpace);
                bases.push(`fx-cell fx-s${shape}${isSpace ? ' fx-space' : ''}`);
                centers.push({ x: offX + c * CELL + CELL / 2, y: offY + r * CELL + CELL / 2 });
                list.push({ i: list.length, ch: isSpace ? '' : ch });
            }
        }
        centerRef.current = centers;
        spaceRef.current = spaces;
        baseRef.current = bases;
        memRef.current = new Array(list.length).fill(0);
        lvlRef.current = new Array(list.length).fill(-1);
        nodesRef.current = new Array(list.length);
        setCells(list);
    }, []);

    useEffect(() => {
        build();
        const onResize = () => build();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [build]);

    // 거리 → 선명도 단계.
    const distLevel = (d) => {
        if (d <= R_FOVEA) return LEVELS;
        if (d >= R_EDGE) return 0;
        return Math.round(LEVELS * (1 - (d - R_FOVEA) / (R_EDGE - R_FOVEA)));
    };

    // 상시 rAF 루프 — 시선 거리로 목표 선명도를 잡고, 잔상(느린 하강)을 얹는다.
    useEffect(() => {
        if (!cells.length) return undefined;
        const tick = () => {
            const centers = centerRef.current;
            const mem = memRef.current;
            const lvls = lvlRef.current;
            const nodes = nodesRef.current;
            const bases = baseRef.current;
            const spaces = spaceRef.current;
            const g = gazeRef.current;

            for (let i = 0; i < centers.length; i++) {
                if (spaces[i]) continue; // 공백 칸은 늘 비어 있다(글자 사이 여백).
                let base = 0;
                if (g.on) {
                    const dx = centers[i].x - g.x;
                    const dy = centers[i].y - g.y;
                    base = distLevel(Math.sqrt(dx * dx + dy * dy));
                }
                // 초점이 닿으면 즉시 또렷해지고(상승), 벗어나면 천천히 흐려진다(잔상).
                if (base > mem[i]) mem[i] = base;
                else mem[i] += (base - mem[i]) * 0.07;

                const lvl = Math.round(mem[i]);
                if (lvl !== lvls[i]) {
                    lvls[i] = lvl;
                    const node = nodes[i];
                    if (node) node.className = `${bases[i]} fx-l${lvl}`;
                }
            }

            const ret = reticleRef.current;
            if (ret) {
                if (g.on) {
                    ret.style.opacity = '1';
                    ret.style.transform = `translate(${g.x}px, ${g.y}px)`;
                } else {
                    ret.style.opacity = '0';
                }
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [cells.length]);

    const onMove = useCallback((e) => {
        const el = stageRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        gazeRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, on: true };
        if (!movedRef.current) { movedRef.current = true; setMoved(true); }
    }, []);

    const onLeave = useCallback(() => {
        gazeRef.current = { ...gazeRef.current, on: false };
    }, []);

    return (
        <LabShell
            title="Fovea"
            subtitle="시선이 닿는 곳만 글자가 된다 — 중심와로만 읽는 눈"
            eyebrow="body · art toy · typography"
            path="fovea"
        >
            <div className="fx-wrap">
                <div
                    className={`fx-stage ${moved ? 'is-moved' : ''}`}
                    ref={stageRef}
                    onPointerMove={onMove}
                    onPointerLeave={onLeave}
                >
                    <div className="fx-grid" aria-hidden="true">
                        {cells.map((c) => (
                            <span
                                key={c.i}
                                ref={(n) => { nodesRef.current[c.i] = n; }}
                                className={baseRef.current[c.i] || 'fx-cell'}
                            >
                                <span className="fx-blob" />
                                <span className="fx-ch">{c.ch}</span>
                            </span>
                        ))}
                    </div>

                    <div className="fx-reticle" ref={reticleRef} aria-hidden="true">
                        <span className="fx-ring" />
                        <span className="fx-cross fx-cross-h" />
                        <span className="fx-cross fx-cross-v" />
                    </div>

                    <p className="fx-hint k-mono">{'시선을 옮겨 보세요 →'}</p>
                </div>

                <p className="fx-note">
                    화면 전체가 한눈에 읽히는 것 같지만, 또렷한 건 늘 시선 둘레 한 점뿐이다.
                    눈을 옮겨야 다음 글자가 맺힌다.
                </p>
            </div>
        </LabShell>
    );
};

export default Fovea;
