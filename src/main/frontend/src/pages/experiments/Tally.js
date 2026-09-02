import React, { useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Tally.css';

// TALLY — 큰 수를 세는 시간으로 (감이 안 오는 숫자 × 만질 수 있는 데이터 × CSS만으로 × 스크롤 없이 한 화면).
//   소재: 감이 안 오는 숫자 — 100만·10억·1조는 "크다"까지만 와닿고 그 크기가 손에 안 잡힌다.
//         1초에 하나씩 쉬지 않고 센다면? 100만은 열하루, 10억은 서른두 해, 1조는 삼만 년이다.
//         수를 '세는 시간'으로 바꾸면 비로소 감이 온다.
//   형식: 만질 수 있는 데이터 — 레버 하나를 손으로 밀면 계수기가 돌며 수가 커지고,
//         그 수를 세는 데 걸리는 시간이 같이 부푼다. 값을 굴려보며 크기를 몸으로 잰다.
//   기술: CSS만으로 — JS 상태는 레버 위치(t) 하나뿐. 나머지 수·시간 텍스트는 그 t에서 파생하고,
//         트랙 채움·눈금 점등은 --t 커스텀 프로퍼티를 받은 CSS가 굴린다(rAF·캔버스 없음).
//   제약: 스크롤 없이 한 화면 — 계수기·시간 판독·레버·시간 눈금이 한 화면에 담긴다.

// 레버 위치 t(0~100) → 세는 개수 N = 10^(t/100 * 12) → 1 ~ 1조.
const EXP_MAX = 12;
const countFor = (t) => Math.round(10 ** ((t / 100) * EXP_MAX));

const YEAR = 31557600; // 365.25일(초)

// 시간 눈금 — 세는 시간(초)을 로그축(1초~1조초≈3.2만년) 위에 놓는다.
const MARKS = [
    { s: 1, label: '초' },
    { s: 60, label: '분' },
    { s: 3600, label: '시간' },
    { s: 86400, label: '하루' },
    { s: 604800, label: '한 주' },
    { s: 2629800, label: '한 달' },
    { s: YEAR, label: '한 해' },
    { s: 80 * YEAR, label: '평생' },
    { s: 1000 * YEAR, label: '천 년' },
    { s: 10000 * YEAR, label: '문명' },
].map((m) => ({ ...m, p: (Math.log10(m.s) / EXP_MAX) * 100 }));

// 큰 수를 한국어 단위(만·억·조)로 압축해 읽어준다.
const koreanCompact = (n) => {
    if (n < 10000) return n.toLocaleString('en-US');
    const units = [[1e12, '조'], [1e8, '억'], [1e4, '만']];
    const parts = [];
    let r = n;
    for (const [v, u] of units) {
        if (r >= v) {
            parts.push(`${Math.floor(r / v)}${u}`);
            r %= v;
        }
        if (parts.length === 2) break;
    }
    return parts.join(' ');
};

// 세는 데 걸리는 시간(초, 1개/초)을 사람이 잡히는 단위로.
const durParts = (sec) => {
    const s = Math.max(1, sec);
    if (s < 60) return [String(Math.round(s)), '초'];
    if (s < 3600) return [(s / 60).toFixed(s < 600 ? 1 : 0), '분'];
    if (s < 86400) return [(s / 3600).toFixed(s < 36000 ? 1 : 0), '시간'];
    if (s < YEAR) return [(s / 86400).toFixed(s < 864000 ? 1 : 0), '일'];
    const y = s / YEAR;
    if (y < 10) return [y.toFixed(1), '년'];
    if (y < 10000) return [Math.round(y).toLocaleString('en-US'), '년'];
    return [koreanCompact(Math.round(y)), '년'];
};

const Tally = () => {
    const [t, setT] = useState(41); // 시작점: '하루'(N≈8만) 언저리 — 이미 놀랄 만한 수에서 출발.

    const n = countFor(t);
    const digits = String(n).padStart(13, '0'); // 최대 1조(13자리) 계수기 휠.
    const firstSig = digits.length - String(n).length; // 앞의 0(비활성) 개수.
    const [durVal, durUnit] = durParts(n);

    return (
        <LabShell
            title="Tally"
            subtitle="큰 수를 세는 시간으로 · 초당 하나씩 세면"
            eyebrow="감이 안 오는 숫자 / 만질 수 있는 데이터"
            path="tally"
        >
            <section className="tally-wrap" style={{ '--t': t }} aria-label="큰 수를 세는 시간으로 환산하는 계수기">
                <div className="tally-panel">
                    {/* 계수기(오도미터) — 지금 세고 있는 개수 */}
                    <div className="odo" aria-hidden="true">
                        <span className="odo-lamp" />
                        <div className="odo-wheels">
                            {digits.split('').map((d, i) => (
                                <span
                                    // eslint-disable-next-line react/no-array-index-key
                                    key={i}
                                    className={`wheel${i < firstSig ? ' off' : ''}${(digits.length - i) % 3 === 0 && i !== digits.length - 1 ? ' grp' : ''}`}
                                >
                                    {d}
                                </span>
                            ))}
                        </div>
                        <div className="odo-read">{koreanCompact(n)}<span className="odo-read-u">개</span></div>
                    </div>

                    {/* 시간 판독 — 이만큼 세는 데 걸리는 시간 */}
                    <div className="dur">
                        <span className="dur-k k-mono">이만큼 세는 데</span>
                        <span className="dur-v">
                            {durVal}<span className="dur-u">{durUnit}</span>
                        </span>
                        <span className="dur-s k-mono">1초에 하나씩, 쉬지 않고</span>
                    </div>
                </div>

                {/* 레버 — 밀면 수가 커지고 시간이 부푼다 */}
                <div className="rail">
                    <div className="rail-track" aria-hidden="true">
                        <div className="rail-fill" />
                        {MARKS.map((m) => (
                            <span key={m.label} className="tick" style={{ left: `${m.p}%` }} />
                        ))}
                    </div>
                    <input
                        className="rail-input"
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={t}
                        onChange={(e) => setT(Number(e.target.value))}
                        aria-label="세는 개수를 조절하는 레버 — 밀수록 수가 커진다"
                        aria-valuetext={`${koreanCompact(n)}개, 세는 시간 약 ${durVal}${durUnit}`}
                    />
                    <div className="rail-marks" aria-hidden="true">
                        {MARKS.map((m) => (
                            <span key={m.label} className="mk" style={{ left: `${m.p}%`, '--p': m.p }}>
                                {m.label}
                            </span>
                        ))}
                    </div>
                </div>

                <p className="hint k-mono">
                    <span className="chev">◀</span>&nbsp;레버를 밀어 수를 키워보세요&nbsp;<span className="chev">▶</span>
                </p>
            </section>
        </LabShell>
    );
};

export default Tally;
