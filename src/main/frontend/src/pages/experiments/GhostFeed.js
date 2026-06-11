import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/GhostFeed.css';

// 사람이 쓴 듯한 게시물: 맥락 없는 일상, 사소한 실수, 결론 없는 감정
const HUMANS = [
    { text: '아 방금 라면 끓이다가 불 안 켜고 5분 기다림 진짜 한심하다', tell: '맥락 없는 자조적 실수담 — 봇은 이런 시시한 디테일을 잘 안 만든다.' },
    { text: '오늘 비 와서 그냥 집에서 귤 까먹는 중 ㅋㅋ 행복', tell: '팔지도 가르치지도 않는 일상의 단편.' },
    { text: '시험 2개 남았는데 손이 안 움직여... 누가 나 좀 말려줘', tell: '해시태그도 링크도 없는 두서없는 감정 토로.' },
    { text: '어제 친구랑 싸웠는데 먼저 연락할까 말까 30분째 폰만 봄', tell: '결론 없는 망설임 — 봇은 보통 명확한 메시지를 던진다.' },
    { text: '지하철에 텀블러 두고 내림 벌써 세 번째임 나 진짜 왜 이래', tell: '반복되는 자기 실수 + 구체적 횟수 = 진짜 경험의 흔적.' },
    { text: '갑자기 초등학교 때 친구 이름 생각났는데 연락처가 없네', tell: '아무 행동도 권하지 않는 기억의 환기.' },
    { text: '배달 시켰는데 음료 안 왔어ㅠ 근데 귀찮아서 그냥 넘어감', tell: '귀찮음에 지는 인간미 — 봇은 늘 적극적이다.' },
];

// 봇이 쓴 듯한 게시물: 동기부여, CTA, 해시태그, 공포 마케팅
const BOTS = [
    { text: '여러분, 성공은 결국 마인드셋입니다 ✨ 오늘도 1%씩 성장하세요! #동기부여 #성공습관', tell: '추상적 동기부여 + 해시태그 = 양산형 자동 게시물.' },
    { text: '이 제품 써보고 인생 바뀌었어요 😍 자세한 건 프로필 링크 확인! #꿀템 #강추', tell: '프로필 링크 유도 + 과장된 후기 = 광고 봇의 정석.' },
    { text: 'AI 시대, 지금 준비 안 하면 늦습니다. 무료 웨비나 신청 마감 임박 ⏰ #AI #재테크', tell: '공포 마케팅 + 마감 임박 = 클릭 유도 트리거.' },
    { text: '좋은 아침이에요! 오늘 하루도 긍정 에너지 가득 채우세요 🌿💛 #굿모닝 #감사', tell: '누구에게나 복붙 가능한 알맹이 없는 보편적 인사.' },
    { text: '단 7일 만에 팔로워 1만 늘린 비법, 댓글로 "비법" 남기면 보내드려요!', tell: '댓글 키워드 유도 = 자동 DM 깔때기의 신호.' },
    { text: '행복은 멀리 있지 않아요. 작은 것에 감사할 때 찾아옵니다 🌸 #명언 #힐링', tell: '출처 불명의 명언풍 문장 — 맥락 없이 재생산되는 콘텐츠.' },
    { text: '드디어 공개합니다! 누구나 따라 하는 부업 시스템 🔥 선착순 무료 배포 #부업 #파이프라인', tell: '선착순·무료·시스템 = 자동 홍보 트리거 단어 집합.' },
];

// 라운드가 깊어질수록 봇이 섞일 확률이 오른다 (죽은 인터넷 곡선)
const botProbability = (round) => Math.min(0.85, 0.2 + round * 0.025);

const pickFrom = (pool, avoidText) => {
    const candidates = pool.filter((p) => p.text !== avoidText);
    const list = candidates.length ? candidates : pool;
    return list[Math.floor(Math.random() * list.length)];
};

// 해당 라운드의 게시물 한 건을 생성
const makePost = (round, avoidText) => {
    const isBot = Math.random() < botProbability(round);
    const base = pickFrom(isBot ? BOTS : HUMANS, avoidText);
    return { ...base, isBot };
};

const GhostFeed = () => {
    const [round, setRound] = useState(1);
    const [post, setPost] = useState(() => makePost(1, null));
    const [result, setResult] = useState(null); // null | { correct, guessBot }

    const [answered, setAnswered] = useState(0);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [best, setBest] = useState(0);

    const [botCount, setBotCount] = useState(0);
    const [ratioHist, setRatioHist] = useState([]); // 누적 봇 점유율(%)

    const answer = useCallback(
        (guessBot) => {
            if (result) return;
            const correct = guessBot === post.isBot;
            const newBotCount = botCount + (post.isBot ? 1 : 0);
            const ratio = Math.round((newBotCount / round) * 100);

            setResult({ correct, guessBot });
            setAnswered((n) => n + 1);
            setBotCount(newBotCount);
            setRatioHist((h) => [...h.slice(-39), ratio]);
            if (correct) {
                setScore((s) => s + 1);
                setStreak((st) => {
                    const next = st + 1;
                    setBest((b) => Math.max(b, next));
                    return next;
                });
            } else {
                setStreak(0);
            }
        },
        [result, post, botCount, round]
    );

    const next = () => {
        const r = round + 1;
        setRound(r);
        setPost(makePost(r, post.text));
        setResult(null);
    };

    const reset = () => {
        setRound(1);
        setPost(makePost(1, null));
        setResult(null);
        setAnswered(0);
        setScore(0);
        setStreak(0);
        setBest(0);
        setBotCount(0);
        setRatioHist([]);
    };

    const accuracy = answered ? Math.round((score / answered) * 100) : 0;
    const aiShare = ratioHist.length ? ratioHist[ratioHist.length - 1] : 0;
    const survival = 100 - aiShare; // 피드 생존률(사람 비율)
    const maxBar = 100;

    return (
        <div className="gf-container">
            <div className="gf-inner">
                <Link to="/" className="gf-back">← 실험실로 돌아가기</Link>

                <header className="gf-header">
                    <h1 className="gf-title">GHOST&nbsp;FEED</h1>
                    <p className="gf-sub">
                        {'// 이 글, 사람이 썼을까 봇이 썼을까 — 죽은 인터넷 이론 체험실'}
                    </p>
                </header>

                <div className="gf-stage">
                    {/* 게시물 카드 */}
                    <div className="gf-feed">
                        <div className="gf-post">
                            <div className="gf-post-top">
                                <span className="gf-avatar">@</span>
                                <span className="gf-handle">익명_{String(round).padStart(3, '0')}</span>
                                <span className="gf-dot">·</span>
                                <span className="gf-time">방금</span>
                            </div>
                            <p className="gf-post-text">{post.text}</p>
                            <div className="gf-post-meta">{'♡  ⟳  💬'}</div>
                        </div>

                        {!result ? (
                            <div className="gf-choices">
                                <button type="button" className="gf-choice human" onClick={() => answer(false)}>
                                    🧑 사람
                                </button>
                                <button type="button" className="gf-choice bot" onClick={() => answer(true)}>
                                    🤖 봇
                                </button>
                            </div>
                        ) : (
                            <div className={'gf-reveal ' + (result.correct ? 'ok' : 'no')}>
                                <p className="gf-verdict">
                                    {result.correct ? '정답!' : '오답...'} 이 글은{' '}
                                    <b>{post.isBot ? '🤖 봇' : '🧑 사람'}</b>이 썼습니다.
                                </p>
                                <p className="gf-tell">{post.tell}</p>
                                <button type="button" className="gf-next" onClick={next}>
                                    다음 게시물 →
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 사이드 패널 */}
                    <div className="gf-panel">
                        <div className="gf-stats">
                            <div className="gf-stat">
                                <span className="gf-stat-num">{round}</span>
                                <span className="gf-stat-label">라운드</span>
                            </div>
                            <div className="gf-stat accent">
                                <span className="gf-stat-num">{accuracy}%</span>
                                <span className="gf-stat-label">정확도</span>
                            </div>
                            <div className="gf-stat">
                                <span className="gf-stat-num">{streak}</span>
                                <span className="gf-stat-label">연속</span>
                            </div>
                            <div className="gf-stat">
                                <span className="gf-stat-num">{best}</span>
                                <span className="gf-stat-label">최고 연속</span>
                            </div>
                        </div>

                        {/* AI 점유율 곡선 */}
                        <div className="gf-chart">
                            {ratioHist.length === 0 ? (
                                <span className="gf-chart-empty">{'판별을 시작하면 곡선이 그려져요'}</span>
                            ) : (
                                ratioHist.map((v, i) => (
                                    <span
                                        key={i}
                                        className="gf-bar"
                                        style={{ height: `${(v / maxBar) * 100}%` }}
                                    />
                                ))
                            )}
                        </div>
                        <p className="gf-chart-label">{'피드 내 AI 점유율 (라운드 흐름)'}</p>

                        {/* 피드 생존률 */}
                        <div className="gf-survival">
                            <div className="gf-survival-head">
                                <span>피드 생존률</span>
                                <b>{survival}%</b>
                            </div>
                            <div className="gf-survival-track">
                                <span className="gf-survival-fill" style={{ width: `${survival}%` }} />
                            </div>
                            <p className="gf-survival-note">{'사람이 쓴 글이 남아있는 비율'}</p>
                        </div>

                        <button type="button" className="gf-resetbtn" onClick={reset}>
                            ↺ 처음부터
                        </button>
                    </div>
                </div>

                <footer className="gf-foot">
                    <p>
                        {'라운드가 깊어질수록 피드엔 자동 생성된 글이 점점 더 섞인다. '}
                        {'어느 순간 사람의 글과 봇의 글이 구별되지 않는 지점 — 그게 '}
                        <b>죽은 인터넷</b>
                        {'이 말하는 풍경이다. 당신의 눈은 아직 그 둘을 가를 수 있을까?'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default GhostFeed;
