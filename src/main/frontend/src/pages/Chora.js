import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from '../components/Footer';
import '../assets/css/Main.scss';
import '../styles/Chora.css';

// 홈(Main.js)과 같은 키를 써서 테마 선택이 페이지를 옮겨도 이어지게 한다.
const THEME_KEY = 'devzip.kernel.dark';

const readDark = () => {
    if (typeof window === 'undefined') return false;
    try {
        return JSON.parse(window.localStorage.getItem(THEME_KEY)) === true;
    } catch {
        return false;
    }
};

const features = [
    {
        icon: '🧭',
        title: 'Persona Agents',
        subtitle: '페르소나 에이전트',
        description: '확률 규칙이 아니라 성격과 취향으로 움직입니다. 에이전트는 자신이 왜 그 선택을 했는지 자기 언어로 남깁니다.',
        details: [
            '하루 계획 → 인지 루프 → 결정(go_to / stay / wander / leave)',
            '검색 점수 = 최근성 × 중요도 × 관련성으로 기억을 끌어옴',
            '반경 400m·카테고리별 후보만 인지 — 전지적 시야 없음'
        ]
    },
    {
        icon: '🗺️',
        title: 'Real GIS World',
        subtitle: '실제 지리정보 위의 3D 도시',
        description: '가상의 격자가 아니라 실제 서울 서교동·연남동입니다. 에이전트는 건물을 관통하지 않고 보행 도로망 위에서만 걷습니다.',
        details: [
            'OSMnx 보행 그래프 + A* 경로탐색으로 이동',
            'Cesium 3D Tiles(항공영상 + OSM Buildings)로 렌더링',
            '시뮬레이션의 유일한 소유자는 서버 — Unity는 순수한 뷰'
        ]
    },
    {
        icon: '💬',
        title: 'Prompt to Environment',
        subtitle: '자연어로 바꾸는 도시',
        description: '자연어 한 줄이 검증된 환경 연산으로 번역되어 월드에 적용됩니다. 사람이 말하듯 조건을 바꿉니다.',
        details: [
            'set_weather · rezone · add_poi · close_road 등 구조화된 op',
            'LLM은 월드 상태를 직접 수정하지 않음 — 반드시 검증을 통과',
            '모호한 명령은 적용하지 않고 되물음'
        ]
    },
    {
        icon: '📊',
        title: 'A/B Analysis',
        subtitle: '환경 변경 전후 비교',
        description: '같은 시드로 변경 전/후를 돌려 나란히 놓습니다. 두 실행이 색 스케일을 공유하는 것이 핵심입니다.',
        details: [
            '방문 히트맵 · POI 종류별 방문 변화 델타',
            '각자 정규화하면 총량이 줄어도 같은 그림이 나오기 때문',
            '절대값이 아니라 A/B 간 상대 변화로 읽는 지표'
        ]
    }
];

const decisionLog = `08:16  go_to → Florte Flower Cafe
       꽃이 있는 조용한 카페에서 클래식을 듣고
       따뜻한 커피를 마시며 아침을 시작하고 싶습니다.

08:20  go_to → 브레드랩
       오늘 아침 계획대로 조용한 빵집에서 신제품
       소금빵을 맛보며 차분하게 하루를 시작하고 싶다.

10:01  go_to → 연남짬뽕
       연남짬뽕은 종로의 오래된 노포를 즐겨 찾는
       취향과 딱 맞으며, 토요일 아침 한 끼를
       소박하게 즐기기에 좋겠다.`;

const principles = [
    {
        no: '01',
        title: 'LLM은 의사결정 순간에만 개입한다',
        body: '매 틱 호출은 금지입니다. 이동과 경로탐색은 규칙 기반(A*)이고, LLM은 트리거(하루 시작, 배고픔, 체류 종료, 도착, 환경 변화)가 걸렸을 때만 호출됩니다. 결정 유형별로 모델 티어도 갈립니다 — 일상 결정은 Haiku, 계획·회고는 Sonnet.'
    },
    {
        no: '02',
        title: '에이전트는 전지적이지 않다',
        body: '반경 400m 안에서 카테고리별(식사·카페·술·쇼핑·문화·생활)로 후보를 뽑아 제시합니다. 거리순으로만 뽑으면 밀도 높은 종류가 목록을 잠식합니다 — 대상 구역은 미용실이 이름 있는 POI의 26%라 특히 심했습니다.'
    },
    {
        no: '03',
        title: '기억이 결정에 들어간다',
        body: '“웨이팅이 길어 포기했다”는 기억이 다음 점심 결정 프롬프트에 검색되어 들어갑니다. 검색 점수는 최근성 × 중요도 × 관련성으로 매깁니다.'
    },
    {
        no: '04',
        title: 'LLM이 월드 상태를 직접 수정하지 않는다',
        body: '자연어는 반드시 구조화된 op로 번역되고, 검증을 통과해야 적용됩니다. 모호한 명령은 임의로 해석하지 않고 되묻습니다.'
    }
];

const techStack = [
    { area: 'client', name: 'Unity 6 (LTS)', note: 'Cesium for Unity · URP' },
    { area: 'server', name: 'Python 3.12+ / FastAPI', note: 'uv · ruff · pytest 158종' },
    { area: 'gis', name: 'OSMnx · NetworkX', note: '보행 그래프 · A* / Cesium 3D Tiles' },
    { area: 'llm', name: 'Claude API', note: '결정 유형별 모델 티어 분리' },
    { area: 'transport', name: 'REST + WebSocket', note: 'WGS84 상태 델타 스트림' },
    { area: 'agent', name: '하이브리드 설계', note: 'LLM 결정 · 규칙 기반 이동' }
];

const phases = [
    { id: 'phase 0', body: 'GIS 임포트, 시뮬레이션 코어, Unity·Cesium 렌더, WebSocket 스트림', state: 'done' },
    { id: 'phase 1', body: 'LLM 게이트웨이, 페르소나, 인지 루프, 기억·계획·회고', state: 'done' },
    { id: 'phase 2', body: '환경 op, 자연어 번역, 지각 전파, A/B 실행', state: 'done' },
    { id: 'phase 3', body: '위치 샘플링, 지표, 분석 API, 대시보드·A/B 비교 뷰', state: 'done' },
    { id: 'phase 4', body: '대규모 스케일, 대중교통·차량, 캘리브레이션, PostGIS', state: 'backlog' }
];

const notVerified = [
    'Unity Play 모드 육안 확인 3건',
    '에이전트 100명 스케일 성능',
    '실측 유동인구 데이터와의 상관 검증'
];

const Chora = () => {
    const [dark, setDark] = useState(readDark);

    useEffect(() => {
        try {
            window.localStorage.setItem(THEME_KEY, JSON.stringify(dark));
        } catch {
            /* 저장 실패는 무시 — 테마는 이번 세션에만 적용된다 */
        }
    }, [dark]);

    return (
        <div className="k-os chora-os" data-theme={dark ? 'dark' : 'light'}>
            <Helmet>
                <title>Chora - LLM 페르소나 기반 GIS 시뮬레이션 플랫폼 | Persona-driven Urban Simulation</title>
                <meta name="description" content="Chora는 실제 지리정보로 만든 3D 도시 위에 LLM 페르소나 에이전트를 배치하고, 자연어로 환경을 바꿔 군중 행동 변화를 관찰·분석하는 B2B 시뮬레이션 도구입니다. Chora is a persona-driven GIS simulation platform for urban and commercial analysis." />
                <meta name="keywords" content="Chora, chora, GIS 시뮬레이션, urban simulation, LLM 에이전트, agent based modeling, ABM, 상권분석, 도시계획, Unity, Cesium, OSMnx, DevZip" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://devzip.site/chora" />
                <meta property="og:title" content="Chora - Persona-driven GIS Simulation" />
                <meta property="og:description" content="Change the city in plain language, and watch the crowd change with it. LLM persona agents walking a real 3D city." />
                <meta property="og:locale" content="ko_KR" />
                <meta property="og:locale:alternate" content="en_US" />

                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:title" content="Chora - Persona-driven GIS Simulation" />
                <meta property="twitter:description" content="LLM persona agents on a real 3D city. Change the environment in plain language and compare the before/after." />

                <link rel="alternate" hrefLang="ko" href="https://devzip.site/chora" />
                <link rel="alternate" hrefLang="en" href="https://devzip.site/chora" />
                <link rel="alternate" hrefLang="x-default" href="https://devzip.site/chora" />
                <link rel="canonical" href="https://devzip.site/chora" />

                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'SoftwareApplication',
                        name: 'Chora',
                        alternateName: ['chora', '코라'],
                        applicationCategory: 'SimulationApplication',
                        operatingSystem: 'Windows, macOS',
                        description: 'LLM persona-driven GIS simulation platform. Place AI agents with distinct personas on a real 3D city, change the environment in natural language, and analyze how crowd behavior shifts.',
                        url: 'https://devzip.site/chora',
                        author: { '@type': 'Person', name: 'Hoooon22' }
                    })}
                </script>
            </Helmet>

            <header className="k-menubar">
                <div className="k-brand">
                    <span className="dia">◆</span>
                    <span className="nm">DEVZIP</span>
                    <span className="ver k-mono">{'/ kernel v3.0'}</span>
                </div>
                <nav className="k-mb-nav">
                    <a href="/">home</a>
                    <a className="on" href="/chora">chora</a>
                    <a href="/library">library</a>
                    <a href="https://github.com/Hoooon22/Chora" target="_blank" rel="noopener noreferrer">github</a>
                </nav>
                <div className="k-mb-tray">
                    <button
                        type="button"
                        className="k-theme k-mono"
                        onClick={() => setDark(d => !d)}
                        aria-label="테마 전환"
                    >
                        {dark ? '☀ light' : '☾ dark'}
                    </button>
                </div>
            </header>

            <main className="k-desk chora-desk">
                {/* ── 히어로 ── */}
                <section className="k-win chora-hero">
                    <div className="k-win-bar">
                        <div className="k-dots"><i></i><i></i><i></i></div>
                        <span className="path k-mono"><span className="dir">/srv/</span>chora</span>
                        <span className="meta k-mono">status: 개발 중</span>
                    </div>
                    <div className="chora-hero-bd">
                        <div className="tx">
                            <span className="k-eyebrow"><span className="sq"></span>simulation</span>
                            <h1>도시를 바꾸면,<br /><span className="mk">사람들이 달라진다.</span></h1>
                            <p className="lead">LLM 페르소나 기반 GIS 시뮬레이션 플랫폼</p>
                            <p>
                                실제 지리정보로 만든 3D 도시 위에 고유한 페르소나를 가진 AI 에이전트를 배치하고,
                                자연어로 도시 환경을 바꿔 군중의 행동이 어떻게 달라지는지 관찰·분석하는
                                B2B 시뮬레이션 도구입니다.
                            </p>
                            <div className="k-cta">
                                <a
                                    className="k-btn"
                                    href="https://github.com/Hoooon22/Chora"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    GitHub 저장소 →
                                </a>
                                <a className="k-btn ghost" href="mailto:momo990305@gmail.com">도입 문의</a>
                            </div>
                        </div>
                        <div className="chora-prompt k-mono">
                            <div className="ln in">
                                <span className="caret">$</span> 이 구역을 상업지역으로 바꾸고, 비 오는 주말 오후로 설정해 줘
                            </div>
                            <div className="ln"><span className="ok">[ ok ]</span> rezone → commercial</div>
                            <div className="ln"><span className="ok">[ ok ]</span> set_weather → rain</div>
                            <div className="ln"><span className="ok">[ ok ]</span> set_time → sat 14:00</div>
                            <div className="ln"><span className="dim">[ .. ]</span> 24 agents re-planning</div>
                            <div className="out">
                                도시가 바뀌고, 에이전트들이 각자의 성격대로 반응하고,<br />
                                방문 분포가 달라집니다.<span className="cur">▌</span>
                            </div>
                        </div>
                    </div>
                    <div className="k-resize"></div>
                </section>

                {/* ── 왜 만드는가 ── */}
                <section className="k-win">
                    <div className="k-win-bar">
                        <div className="k-dots"><i></i><i></i><i></i></div>
                        <span className="path k-mono"><span className="dir">/doc/</span>why</span>
                    </div>
                    <div className="chora-bd">
                        <h2 className="chora-h2">왜 만드는가</h2>
                        <div className="chora-two">
                            <article className="chora-note">
                                <h3>정적 데이터는 미래를 말하지 못한다</h3>
                                <p>
                                    기존 상권 분석과 도시 계획은 <b>과거의 정적 데이터</b>에 의존합니다.
                                    신규 건물, 날씨, 정책 같은 새로운 변수가 만들어 낼 동적 결과는
                                    거기에 들어 있지 않습니다.
                                </p>
                            </article>
                            <article className="chora-note">
                                <h3>확률 규칙은 사람을 담지 못한다</h3>
                                <p>
                                    전통적 ABM(행위자 기반 모델)은 확률 규칙 기반이라
                                    인간의 <b>맥락적·비합리적 의사결정</b>을 담지 못합니다.
                                    “왜 그렇게 행동했는지”가 모델 안에 남지 않습니다.
                                </p>
                            </article>
                        </div>
                        <p className="chora-lede">
                            Chora는 그 간극을 LLM 페르소나로 메웁니다.
                            에이전트는 자기 언어로 이유를 남기고, 그 이유가 곧 분석의 근거가 됩니다.
                        </p>
                    </div>
                    <div className="k-resize"></div>
                </section>

                {/* ── 결정 로그 ── */}
                <section className="k-win">
                    <div className="k-win-bar">
                        <div className="k-dots"><i></i><i></i><i></i></div>
                        <span className="path k-mono"><span className="dir">/var/log/</span>decision_log.jsonl</span>
                        <span className="meta k-mono">tail -n 3</span>
                    </div>
                    <div className="chora-bd">
                        <h2 className="chora-h2">에이전트는 이렇게 말한다</h2>
                        <pre className="chora-log k-mono"><code>{decisionLog}</code></pre>
                        <p className="chora-cap">
                            마지막 줄은 81세 방문객 페르소나입니다.
                            그 전 다섯 번의 결정에서 “20대의 트렌디한 가게는 내키지 않는다”며 걷기만 하다가,
                            취향에 맞는 곳을 찾아 들어갔습니다.
                        </p>
                    </div>
                    <div className="k-resize"></div>
                </section>

                {/* ── 핵심 기능 ── */}
                <section className="k-win">
                    <div className="k-win-bar">
                        <div className="k-dots"><i></i><i></i><i></i></div>
                        <span className="path k-mono"><span className="dir">/opt/</span>features</span>
                        <span className="meta k-mono">{features.length} modules</span>
                    </div>
                    <div className="chora-bd">
                        <h2 className="chora-h2">무엇을 할 수 있나</h2>
                        <div className="chora-grid">
                            {features.map((f) => (
                                <article key={f.title} className="chora-card">
                                    <div className="glw">{f.icon}</div>
                                    <h3>{f.title}</h3>
                                    <span className="sub k-mono">{f.subtitle}</span>
                                    <p>{f.description}</p>
                                    <ul>
                                        {f.details.map((d) => <li key={d}>{d}</li>)}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    </div>
                    <div className="k-resize"></div>
                </section>

                {/* ── 동작 원리 ── */}
                <section className="k-win">
                    <div className="k-win-bar">
                        <div className="k-dots"><i></i><i></i><i></i></div>
                        <span className="path k-mono"><span className="dir">/doc/</span>design</span>
                    </div>
                    <div className="chora-bd">
                        <h2 className="chora-h2">어떻게 동작하는가</h2>
                        <p className="chora-sub">LLM을 많이 부르는 게 아니라, 부를 자리를 정확히 고르는 설계입니다.</p>
                        <div className="chora-rules">
                            {principles.map((p) => (
                                <div key={p.no} className="chora-rule">
                                    <div className="no k-mono">{p.no}</div>
                                    <div className="bd">
                                        <h3>{p.title}</h3>
                                        <p>{p.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="k-resize"></div>
                </section>

                {/* ── 실측 게이지 ── */}
                <section className="chora-gauges">
                    <div className="k-win">
                        <div className="k-win-bar"><div className="k-dots"><i></i><i></i><i></i></div><span className="path k-mono"><span className="dir">/sys/</span>cost</span></div>
                        <div className="chora-gauge">
                            <div className="val">$1.53</div>
                            <div className="label">20명 × 시뮬레이션 14시간 + 회고</div>
                            <p>실제 LLM 실측. 실행 9.3분, 결정 383건. 결정의 90%에 기억이 포함됐습니다.</p>
                        </div>
                        <div className="k-resize"></div>
                    </div>
                    <div className="k-win">
                        <div className="k-win-bar"><div className="k-dots"><i></i><i></i><i></i></div><span className="path k-mono"><span className="dir">/sys/</span>metrics</span></div>
                        <div className="chora-gauge">
                            <div className="val">A/B</div>
                            <div className="label">절대값이 아니라 상대 변화</div>
                            <p>예상 매출은 방문 수 × 종류별 객단가 가정입니다. 표에 없는 종류는 0으로 두고 <b>가격 가정 없는 방문</b> 수를 함께 노출합니다. 모르는 값을 기본값으로 메우면 총액이 조용히 부풀기 때문입니다.</p>
                        </div>
                        <div className="k-resize"></div>
                    </div>
                    <div className="k-win">
                        <div className="k-win-bar"><div className="k-dots"><i></i><i></i><i></i></div><span className="path k-mono"><span className="dir">/sys/</span>guard</span></div>
                        <div className="chora-gauge">
                            <div className="val">$0</div>
                            <div className="label">모의 게이트웨이로 무비용 실행</div>
                            <p>실제 LLM을 쓰는 실행은 <code>--yes</code> 없이는 예상 비용만 출력하고 멈춥니다. API 키는 환경변수로만 전달합니다.</p>
                        </div>
                        <div className="k-resize"></div>
                    </div>
                </section>

                {/* ── 기술 스택 ── */}
                <section className="k-win">
                    <div className="k-win-bar">
                        <div className="k-dots"><i></i><i></i><i></i></div>
                        <span className="path k-mono"><span className="dir">/etc/</span>stack</span>
                        <span className="meta k-mono">렌더는 클라이언트 · 진실은 서버</span>
                    </div>
                    <div className="chora-stack">
                        {techStack.map((t) => (
                            <div key={t.name} className="row">
                                <div className="area k-mono">{t.area}</div>
                                <div className="name">{t.name}</div>
                                <div className="note k-mono">{t.note}</div>
                            </div>
                        ))}
                    </div>
                    <div className="k-resize"></div>
                </section>

                {/* ── 현재 상태 ── */}
                <section className="k-win">
                    <div className="k-win-bar">
                        <div className="k-dots"><i></i><i></i><i></i></div>
                        <span className="path k-mono"><span className="dir">/proc/</span>roadmap</span>
                        <span className="meta k-mono">4 / 5 done</span>
                    </div>
                    <div className="chora-phases">
                        {phases.map((p) => (
                            <div key={p.id} className={`row ${p.state}`}>
                                <div className="tag k-mono">{p.id}</div>
                                <div className="bd">{p.body}</div>
                                <div className="st k-mono">{p.state === 'done' ? '완료' : '백로그'}</div>
                            </div>
                        ))}
                    </div>
                    <div className="chora-bd">
                        <div className="chora-warn">
                            <h3>아직 검증되지 않은 것</h3>
                            <ul>
                                {notVerified.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                            <p>상세는 저장소의 <code>docs/ROADMAP.md</code>에 각 항목의 근거와 함께 남겨 두었습니다.</p>
                        </div>
                    </div>
                    <div className="k-resize"></div>
                </section>

                {/* ── CTA ── */}
                <section className="k-win chora-cta">
                    <div className="k-win-bar">
                        <div className="k-dots"><i></i><i></i><i></i></div>
                        <span className="path k-mono"><span className="dir">/srv/</span>chora<span className="dir">/status</span></span>
                    </div>
                    <div className="chora-bd center">
                        <span className="k-eyebrow"><span className="sq"></span>work in progress</span>
                        <h2 className="chora-h2">아직 준비 중입니다</h2>
                        <p className="chora-sub">
                            Chora는 현재 개발 중이며, 데모와 도입 안내는 준비되는 대로 이 페이지에 공개합니다.
                            그동안은 저장소에서 코드와 설계 문서를 먼저 확인하실 수 있습니다.
                        </p>
                        <div className="k-cta center">
                            <a className="k-btn" href="https://github.com/Hoooon22/Chora" target="_blank" rel="noopener noreferrer">GitHub 저장소 방문 →</a>
                            <a className="k-btn ghost" href="mailto:momo990305@gmail.com">momo990305@gmail.com</a>
                        </div>
                    </div>
                    <div className="k-resize"></div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Chora;
