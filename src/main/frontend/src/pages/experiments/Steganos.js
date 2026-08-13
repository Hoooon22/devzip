import React, { useEffect, useMemo, useRef, useState } from 'react';
import LabShell from '../../components/lab/LabShell';
import '../../styles/Steganos.css';

// STEGANOS — LSB 이미지 스테가노그래피 (least-significant-bit steganography).
//   이미지의 각 픽셀은 R·G·B 세 숫자(0~255)로 이뤄진다. 그 숫자의 "최하위 비트"를
//   1 바꿔도 색은 1/256 만큼만 흔들려 눈으로는 구별되지 않는다. 이 눈에 안 보이는
//   여백에 메시지의 비트를 한 조각씩 밀어 넣으면, 겉보기엔 똑같은 사진 속에 글자가 숨는다.
// 밑바탕의 보편 개념: "무엇이든 생성되는 시대에 진짜임을 증명하려면 매체 속에 지각되지
//   않는 정보(출처·워터마크)를 심는다." 특정 인물·사건이 아니라, 매체에 보이지 않는
//   정보를 새겨 넣고 되읽는다는 추상 개념(콘텐츠 프로버넌스/워터마킹)의 원형만 다룬다.

const W = 200;                 // 캐리어 이미지 한 변(px)
const HEADER_BYTES = 3;        // 24비트 길이 헤더

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp3 = (a, b, u) => [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
];

// ── 세 가지 캐리어(원본) 이미지: 픽셀별 색을 절차적으로 생성 ──
const CARRIERS = [
    {
        id: 'sunset', label: '일몰',
        fn: (x, y) => {
            const t = y / W;
            let col = t < 0.6
                ? lerp3([28, 50, 84], [232, 158, 74], t / 0.6)
                : lerp3([232, 158, 74], [42, 28, 22], (t - 0.6) / 0.4);
            const dr = Math.hypot(x - W * 0.5, y - W * 0.58);
            if (dr < W * 0.12) col = lerp3(col, [255, 236, 182], 0.85 * (1 - dr / (W * 0.12)));
            return col;
        },
    },
    {
        id: 'ripple', label: '물결',
        fn: (x, y) => {
            const d = Math.hypot(x - W * 0.5, y - W * 0.5);
            const v = 0.5 + 0.5 * Math.sin(d * 0.26);
            return lerp3([24, 40, 52], [122, 178, 192], v);
        },
    },
    {
        id: 'dunes', label: '사구',
        fn: (x, y) => {
            const t = clamp01((x * 0.4 + y) / (W * 1.4));
            const ridge = 0.5 + 0.5 * Math.sin(x * 0.05 + y * 0.02);
            return lerp3(lerp3([214, 182, 132], [120, 86, 54], t), [238, 214, 170], 0.22 * ridge);
        },
    },
];

const SAMPLES = [
    '이 사진 안에 이 문장이 숨어 있다.',
    'devzip.site — hidden in plain sight',
    '보이지 않는 것을 증명하기',
];

// 픽셀 함수 → ImageData
const makeCarrier = (fn) => {
    const img = new ImageData(W, W);
    const d = img.data;
    for (let y = 0; y < W; y += 1) {
        for (let x = 0; x < W; x += 1) {
            const [r, g, b] = fn(x, y);
            const i = (y * W + x) * 4;
            d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
        }
    }
    return img;
};

// 페이로드(헤더+바이트)를 캐리어의 각 채널 하위 n비트에 심는다.
// 실제로 쓴 채널 수(footprint)를 함께 돌려준다.
const embed = (carrier, payload, n) => {
    const out = new ImageData(new Uint8ClampedArray(carrier.data), W, W);
    const d = out.data;
    const mask = (1 << n) - 1;
    const nbits = payload.length * 8;
    let bitpos = 0;
    let channels = 0;
    const total = W * W;
    for (let p = 0; p < total && bitpos < nbits; p += 1) {
        for (let c = 0; c < 3 && bitpos < nbits; c += 1) {
            let chunk = 0;
            for (let k = 0; k < n; k += 1) {
                const gp = bitpos + k;
                let bit = 0;
                if (gp < nbits) bit = (payload[gp >> 3] >> (7 - (gp & 7))) & 1;
                chunk = (chunk << 1) | bit;
            }
            const idx = p * 4 + c;
            d[idx] = (d[idx] & ~mask) | chunk;
            bitpos += n;
            channels += 1;
        }
    }
    return { img: out, channels };
};

// 하위 n비트 스트림에서 헤더를 읽어 길이를 얻고 메시지를 되읽는다.
const extract = (img, n) => {
    const d = img.data;
    const mask = (1 << n) - 1;
    const total = W * W;
    // 필요한 비트만 순차로 읽기 위한 커서
    let p = 0, c = 0, buf = 0, have = 0;
    const nextBits = (want) => {
        while (have < want) {
            if (p >= total) return null;
            const chunk = d[p * 4 + c] & mask;
            buf = (buf << n) | chunk;
            have += n;
            c += 1;
            if (c === 3) { c = 0; p += 1; }
        }
        const shift = have - want;
        const v = (buf >> shift) & ((1 << want) - 1);
        buf &= (1 << shift) - 1;
        have = shift;
        return v;
    };
    const len = nextBits(24);
    const capBytes = Math.floor((total * 3 * n) / 8) - HEADER_BYTES;
    if (len === null || len === 0 || len > capBytes) return { ok: false, text: '' };
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
        const byte = nextBits(8);
        if (byte === null) return { ok: false, text: '' };
        bytes[i] = byte;
    }
    try {
        return { ok: true, text: new TextDecoder('utf-8', { fatal: false }).decode(bytes) };
    } catch {
        return { ok: false, text: '' };
    }
};

const Steganos = () => {
    const carrierRef = useRef(null);   // 원본 캔버스
    const stegoRef = useRef(null);     // 은닉 결과 캔버스
    const stegoDataRef = useRef(null); // 추출용 은닉 결과 픽셀

    const [carrierId, setCarrierId] = useState('sunset');
    const [message, setMessage] = useState(SAMPLES[0]);
    const [bits, setBits] = useState(1);
    const [revealed, setRevealed] = useState(false);
    const [result, setResult] = useState(null); // { from:'stego'|'carrier', ok, text }
    const [metrics, setMetrics] = useState({ psnr: Infinity, changed: 0, footprint: 0 });

    // 선택된 캐리어(원본) 픽셀
    const carrierData = useMemo(
        () => makeCarrier((CARRIERS.find((c) => c.id === carrierId) || CARRIERS[0]).fn),
        [carrierId],
    );

    // 메시지 → 바이트, 용량, 페이로드
    const info = useMemo(() => {
        const msgBytes = new TextEncoder().encode(message);
        const capBits = W * W * 3 * bits;
        const capBytes = Math.floor(capBits / 8) - HEADER_BYTES;
        const usedBytes = Math.min(msgBytes.length, Math.max(0, capBytes));
        const overflow = msgBytes.length > capBytes;
        const len = usedBytes;
        const payload = new Uint8Array(HEADER_BYTES + usedBytes);
        payload[0] = (len >> 16) & 255; payload[1] = (len >> 8) & 255; payload[2] = len & 255;
        payload.set(msgBytes.subarray(0, usedBytes), HEADER_BYTES);
        return { msgLen: msgBytes.length, capBytes, usedBytes, overflow, payload };
    }, [message, bits]);

    const accent = () => {
        const el = document.querySelector('.lab-os');
        const dark = el && el.getAttribute('data-theme') === 'dark';
        return dark ? [74, 222, 168] : [22, 184, 134];
    };

    // 하위 비트 평면(숨은 층)을 액센트로 증폭 렌더
    const paintReveal = (data) => {
        const rv = new ImageData(W, W);
        const rd = rv.data;
        const bg = [12, 14, 18];
        const fg = accent();
        const mask = (1 << bits) - 1;
        const d = data.data;
        for (let i = 0; i < W * W; i += 1) {
            const j = i * 4;
            const t = ((d[j] & mask) + (d[j + 1] & mask) + (d[j + 2] & mask)) / (3 * mask || 1);
            const [r, g, b] = lerp3(bg, fg, t);
            rd[j] = r; rd[j + 1] = g; rd[j + 2] = b; rd[j + 3] = 255;
        }
        return rv;
    };

    // 캐리어·은닉 결과 렌더 + 지표 계산
    useEffect(() => {
        carrierRef.current.getContext('2d').putImageData(carrierData, 0, 0);
        const { img } = embed(carrierData, info.payload, bits);
        stegoDataRef.current = img;
        stegoRef.current.getContext('2d').putImageData(revealed ? paintReveal(img) : img, 0, 0);

        const cd = carrierData.data, sd = img.data;
        let mse = 0, changed = 0;
        for (let i = 0; i < W * W; i += 1) {
            const j = i * 4;
            let diff = false;
            for (let k = 0; k < 3; k += 1) {
                const dd = cd[j + k] - sd[j + k];
                mse += dd * dd;
                if (dd !== 0) diff = true;
            }
            if (diff) changed += 1;
        }
        mse /= W * W * 3;
        setMetrics({
            psnr: mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse),
            changed: (changed / (W * W)) * 100,
            footprint: changed,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [carrierData, info, bits, revealed]);

    const doExtract = (from) => {
        const data = from === 'carrier' ? carrierData : stegoDataRef.current;
        if (!data) return;
        setResult({ from, ...extract(data, bits) });
    };

    const psnrTxt = metrics.psnr === Infinity ? '∞' : metrics.psnr.toFixed(1);
    const psnrPct = Math.min(100, (metrics.psnr === Infinity ? 60 : metrics.psnr) / 60 * 100);
    const capPct = info.capBytes > 0 ? Math.min(100, (info.usedBytes / info.capBytes) * 100) : 0;

    return (
        <LabShell
            title="STEGANOS"
            eyebrow="least-significant-bit steganography"
            subtitle={'// 똑같아 보이는 사진 속 최하위 비트에 메시지를 숨기고 되읽는다'}
            path="steganos.exe"
        >
            {/* 컨트롤 */}
            <section className="k-win sg-ctrl-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/hide/</span>controls</span>
                    <span className="meta k-mono">200×200 · RGB 하위 {bits}비트</span>
                </div>
                <div className="sg-ctrl">
                    <div className="sg-ctrl-block sg-grow">
                        <span className="sg-lab k-mono">숨길 메시지</span>
                        <textarea
                            className="sg-input"
                            value={message}
                            spellCheck={false}
                            rows={2}
                            onChange={(e) => { setMessage(e.target.value); setResult(null); }}
                            placeholder="여기에 문장을 입력하면 오른쪽 사진 속에 숨습니다"
                            aria-label="숨길 메시지"
                        />
                        <div className="sg-samples">
                            {SAMPLES.map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="sg-chip"
                                    onClick={() => { setMessage(s); setResult(null); }}
                                >
                                    예시 {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="sg-ctrl-block">
                        <span className="sg-lab k-mono">캐리어(원본)</span>
                        <div className="sg-seg">
                            {CARRIERS.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    className={`sg-seg-btn${carrierId === c.id ? ' on' : ''}`}
                                    onClick={() => setCarrierId(c.id)}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                        <span className="sg-lab k-mono" style={{ marginTop: 6 }}>
                            채널당 하위 비트 <b>{bits}</b>
                        </span>
                        <input
                            type="range" min="1" max="4" step="1" value={bits}
                            onChange={(e) => { setBits(parseInt(e.target.value, 10)); setResult(null); }}
                            className="sg-range"
                            aria-label="채널당 하위 비트 수"
                        />
                    </div>
                </div>
            </section>

            {/* 스테이지: 원본 vs 은닉 결과 */}
            <section className="k-win sg-stage-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/hide/</span>compare</span>
                    <span className="meta k-mono">눈으로는 구별되지 않는다</span>
                </div>
                <div className="sg-stage">
                    <figure className="sg-fig">
                        <canvas ref={carrierRef} width={W} height={W} className="sg-canvas" aria-label="원본 이미지" />
                        <figcaption className="sg-cap k-mono">원본 (carrier)</figcaption>
                    </figure>
                    <figure className="sg-fig">
                        <canvas ref={stegoRef} width={W} height={W} className="sg-canvas" aria-label="메시지가 숨겨진 이미지" />
                        <figcaption className="sg-cap k-mono">
                            {revealed ? '숨은 층 (하위 비트 증폭)' : '은닉 결과 (stego)'}
                        </figcaption>
                    </figure>
                </div>
                <div className="sg-stage-foot">
                    <button
                        type="button"
                        className={`sg-btn${revealed ? ' sg-btn-hot' : ' sg-btn-ghost'}`}
                        onClick={() => setRevealed((r) => !r)}
                    >
                        {revealed ? '● 사진으로 돌아가기' : '◐ 최하위 비트 들여다보기'}
                    </button>
                    <span className="sg-note k-mono">
                        {revealed
                            ? '// 밝게 빛나는 영역이 메시지가 차지한 자리 — 길수록 넓어진다'
                            : '// 오른쪽에 메시지가 들어 있지만 왼쪽과 똑같아 보인다'}
                    </span>
                </div>
            </section>

            {/* 추출(되읽기) */}
            <section className="k-win sg-ex-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/read/</span>extract</span>
                    <span className="meta k-mono">받는 쪽은 하위 비트 수를 알아야 한다</span>
                </div>
                <div className="sg-ex">
                    <div className="sg-ex-btns">
                        <button type="button" className="sg-btn sg-btn-hot" onClick={() => doExtract('stego')}>
                            은닉 결과에서 추출
                        </button>
                        <button type="button" className="sg-btn sg-btn-ghost" onClick={() => doExtract('carrier')}>
                            원본에서 추출(대조)
                        </button>
                    </div>
                    <div className={`sg-out${result ? (result.ok ? ' ok' : ' bad') : ''}`}>
                        {!result && <span className="sg-out-ph k-mono">{'// 버튼을 누르면 픽셀에서 되읽은 결과가 여기 나타납니다'}</span>}
                        {result && result.ok && (
                            <>
                                <span className="sg-out-tag k-mono">
                                    ✓ {result.from === 'stego' ? '은닉 결과' : '원본'}에서 복원됨
                                </span>
                                <p className="sg-out-text">{result.text}</p>
                            </>
                        )}
                        {result && !result.ok && (
                            <>
                                <span className="sg-out-tag k-mono bad">✗ 숨은 메시지 없음 / 복원 실패</span>
                                <p className="sg-out-text mute">
                                    {result.from === 'carrier'
                                        ? '원본의 하위 비트는 그저 사진의 일부일 뿐, 심어둔 메시지가 없다.'
                                        : '헤더 길이가 용량을 벗어났다 — 비트 수가 다르거나 손상된 경우다.'}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* 지표 */}
            <section className="k-win sg-stat-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">/stats/</span>capacity</span>
                    <span className="meta k-mono">용량 ↔ 은밀성의 거래</span>
                </div>
                <div className="sg-metrics">
                    <div className="sg-metric">
                        <span className="sg-metric-num k-mono">{info.usedBytes}<span className="sg-unit"> / {Math.max(0, info.capBytes)}B</span></span>
                        <span className="sg-metric-lab">메시지 크기 / 최대 용량</span>
                        <div className="sg-bar"><div className="sg-bar-fill" style={{ width: `${capPct}%` }} /></div>
                    </div>
                    <div className="sg-metric">
                        <span className="sg-metric-num k-mono">{psnrTxt}<span className="sg-unit"> dB</span></span>
                        <span className="sg-metric-lab">PSNR (높을수록 안 보임)</span>
                        <div className="sg-bar"><div className="sg-bar-fill hot" style={{ width: `${psnrPct}%` }} /></div>
                    </div>
                    <div className="sg-metric">
                        <span className="sg-metric-num k-mono">{metrics.changed.toFixed(1)}<span className="sg-unit"> %</span></span>
                        <span className="sg-metric-lab">바뀐 픽셀 비율</span>
                        <span className="sg-metric-sub k-mono">{metrics.footprint.toLocaleString('en-US')} px 손댐</span>
                    </div>
                    <div className="sg-metric">
                        <span className="sg-metric-num k-mono" style={{ color: info.overflow ? 'var(--sg-hot)' : undefined }}>
                            {2 ** bits - 1}
                        </span>
                        <span className="sg-metric-lab">채널당 최대 변화량</span>
                        <span className="sg-metric-sub k-mono">
                            {info.overflow ? '⚠ 메시지가 용량 초과 — 잘림' : `0~255 중 ±${2 ** bits - 1}`}
                        </span>
                    </div>
                </div>
            </section>

            {/* 해설 */}
            <section className="k-win sg-foot-win">
                <div className="k-win-bar">
                    <div className="k-dots"><i></i><i></i><i></i></div>
                    <span className="path k-mono"><span className="dir">~/lab/</span>README.md</span>
                </div>
                <footer className="sg-foot">
                    <p>
                        디지털 사진의 한 픽셀은 빨강·초록·파랑을 각각 <b>0~255</b>의 숫자로 적는다. 그 숫자의
                        <b> 최하위 비트(LSB)</b> 하나는 값을 겨우 1만큼 흔들 뿐이라, 200을 201로 바꿔도 사람 눈은
                        차이를 못 느낀다. 스테가노그래피는 바로 이 &quot;눈에 안 보이는 여백&quot;에 메시지를 숨긴다 —
                        글자를 비트로 풀어, 픽셀들의 최하위 비트를 한 조각씩 그 비트로 바꿔 쓰는 것이다. 왼쪽 원본과
                        오른쪽 결과가 똑같아 보이는데도 오른쪽에는 문장이 통째로 들어 있는 이유다.
                    </p>
                    <p>
                        <b>최하위 비트 들여다보기</b>를 눌러 보라. 평소엔 버려지는 그 비트만 골라 밝기를 끝까지 키우면,
                        메시지가 차지한 영역이 구조화된 무늬로 떠오른다. 문장을 길게 쓸수록 이 영역이 넓어진다 —
                        숨길 자리에도 <b>용량</b>이 있기 때문이다. 반대로 되읽을 땐 같은 규칙으로 최하위 비트를 순서대로
                        긁어모아, 맨 앞 24비트의 <b>길이 헤더</b>가 알려 주는 만큼만 바이트로 복원한다. <b>원본에서 추출</b>을
                        누르면 아무 메시지도 안 나온다 — 거기엔 심어둔 게 없으니까.
                    </p>
                    <p>
                        <b>채널당 하위 비트</b>를 늘리면 한 픽셀에 더 많은 정보를 욱여넣어 <b>용량</b>이 커지고, 같은 문장은
                        더 적은 픽셀에 담겨 손댄 영역이 오히려 <b>줄어든다</b>. 대신 픽셀 하나가 최대 ±(2ⁿ−1)까지
                        출렁여 화질 지표 <b>PSNR</b>이 떨어지고, 통계적으로도 들키기 쉬워진다. 이것이 스테가노그래피의
                        핵심 거래 — <b>많이 숨길수록 티가 난다</b>. 캐리어를 매끈한 &quot;물결&quot;로 바꿔 보면, 원본의 하위
                        비트가 거의 비어 있어 숨긴 메시지가 더 도드라지는 것도 보인다(질감이 거친 사진일수록 잘 숨는다).
                    </p>
                    <p>
                        같은 원리가 지금은 <b>콘텐츠 출처(provenance)</b> 문제로 되돌아왔다. 무엇이든 생성해 낼 수 있는
                        시대에는 &quot;이것이 어디서 왔는가&quot;를 매체 안에 지각되지 않게 새겨 두는 <b>보이지 않는 워터마크</b>가
                        진위의 근거가 된다. 여기 심은 문장이 눈에 안 보이지만 규칙만 알면 언제든 되읽히듯, 워터마크도
                        보이지 않으면서 검증 가능해야 한다 — 그리고 압축·크롭·재생성에 얼마나 살아남느냐가 그 가치를 가른다.
                    </p>
                    <p className="sg-disclaimer">
                        * 교육용 단순화 구현입니다. 캐리어 이미지는 브라우저에서 절차적으로 생성되며, 메시지는 UTF-8 →
                        24비트 길이 헤더 + 바이트를 RGB 채널 하위 n비트에 순차 기록하는 방식으로 심습니다. 서버로 전송되는
                        데이터는 없고, 실제 은닉 통신·탐지(스테그아날리시스)와는 무관한 개념 실험입니다.
                    </p>
                </footer>
            </section>
        </LabShell>
    );
};

export default Steganos;
