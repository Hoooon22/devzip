import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/FeedRank.css';

// 추천 랭킹 신호 시뮬레이터.
// 핵심: 피드는 "누구를 팔로우했나"가 아니라 신호들의 가중합 점수로 정렬된다.
//   점수 = Σ (신호 가중치 × 게시물 지표)
// 신호: 완성률 / 재시청 / 공유 / 댓글 / 팔로워 도달 / 관심 적합(학습값)
// 게시물을 "본다"를 누르면 그 주제의 관심값이 오르고 나머지는 조금 식는다 →
// 관심 적합 신호가 커질수록 피드가 한 주제로 쏠리는 필터 버블이 만들어진다.

const TOPICS = {
    game: { label: '게임', emoji: '🎮' },
    cook: { label: '요리', emoji: '🍳' },
    fit: { label: '운동', emoji: '🏋️' },
    music: { label: '음악', emoji: '🎵' },
    comedy: { label: '코미디', emoji: '😂' },
};

// 후보 풀: 주제별 4개. 지표는 0~1 (완성률·재시청·공유·댓글·팔로워 도달).
// 주제마다 강한 신호가 다른 "대표글" 1개 + 약한 글 3개 → 가중치를 바꾸면
// 어느 주제가 위로 올라오는지가 바뀐다(예: 팔로워 도달을 키우면 운동이 떡상).
const POSTS = [
    { id: 1, topic: 'game', title: '솔로랭크 탈출 빌드', completion: 0.70, rewatch: 0.55, share: 0.45, comment: 0.80, reach: 0.45 },
    { id: 2, topic: 'game', title: '이 보스 30초컷', completion: 0.66, rewatch: 0.50, share: 0.42, comment: 0.30, reach: 0.26 },
    { id: 3, topic: 'game', title: '신작 첫인상 5분', completion: 0.58, rewatch: 0.42, share: 0.38, comment: 0.34, reach: 0.34 },
    { id: 4, topic: 'game', title: '컨트롤 무너지는 순간', completion: 0.62, rewatch: 0.46, share: 0.40, comment: 0.28, reach: 0.24 },
    { id: 5, topic: 'cook', title: '3분 자취 요리: 계란밥', completion: 0.92, rewatch: 0.50, share: 0.42, comment: 0.30, reach: 0.34 },
    { id: 6, topic: 'cook', title: '원팬 파스타 끝장내기', completion: 0.64, rewatch: 0.46, share: 0.38, comment: 0.26, reach: 0.24 },
    { id: 7, topic: 'cook', title: '편의점 재료로 한 끼', completion: 0.60, rewatch: 0.44, share: 0.44, comment: 0.30, reach: 0.26 },
    { id: 8, topic: 'cook', title: '망한 베이킹 모음', completion: 0.58, rewatch: 0.40, share: 0.46, comment: 0.34, reach: 0.22 },
    { id: 9, topic: 'fit', title: '1일 1운동 30일차', completion: 0.72, rewatch: 0.52, share: 0.38, comment: 0.34, reach: 0.82 },
    { id: 10, topic: 'fit', title: '집에서 코어 5분', completion: 0.66, rewatch: 0.48, share: 0.40, comment: 0.28, reach: 0.32 },
    { id: 11, topic: 'fit', title: '3대 500 도전기', completion: 0.60, rewatch: 0.50, share: 0.42, comment: 0.38, reach: 0.36 },
    { id: 12, topic: 'fit', title: '아침 스트레칭 루틴', completion: 0.58, rewatch: 0.44, share: 0.34, comment: 0.26, reach: 0.30 },
    { id: 13, topic: 'music', title: '새벽 감성 기타 루프', completion: 0.74, rewatch: 0.92, share: 0.46, comment: 0.32, reach: 0.30 },
    { id: 14, topic: 'music', title: '한 소절 따라 부르기', completion: 0.64, rewatch: 0.54, share: 0.44, comment: 0.34, reach: 0.32 },
    { id: 15, topic: 'music', title: '코드 4개로 작곡', completion: 0.60, rewatch: 0.50, share: 0.42, comment: 0.32, reach: 0.28 },
    { id: 16, topic: 'music', title: '무반주 커버', completion: 0.62, rewatch: 0.54, share: 0.42, comment: 0.30, reach: 0.30 },
    { id: 17, topic: 'comedy', title: '회의 중 딴짓 들킴', completion: 0.78, rewatch: 0.56, share: 0.88, comment: 0.44, reach: 0.34 },
    { id: 18, topic: 'comedy', title: '택배 기다리는 사람', completion: 0.66, rewatch: 0.48, share: 0.50, comment: 0.36, reach: 0.26 },
    { id: 19, topic: 'comedy', title: '알람 끄는 5단계', completion: 0.64, rewatch: 0.46, share: 0.48, comment: 0.34, reach: 0.24 },
    { id: 20, topic: 'comedy', title: '월요일 표정 변화', completion: 0.68, rewatch: 0.50, share: 0.46, comment: 0.34, reach: 0.22 },
];

const SIGNALS = [
    { key: 'completion', label: '완성률', hint: '끝까지 봤는가' },
    { key: 'rewatch', label: '재시청·루프', hint: '다시 돌려봤는가' },
    { key: 'share', label: '공유', hint: '남에게 보냈는가' },
    { key: 'comment', label: '댓글', hint: '말을 남겼는가' },
    { key: 'reach', label: '팔로워 도달', hint: '이미 팔로우했는가' },
    { key: 'affinity', label: '관심 적합', hint: '내 취향과 맞는가 (학습)' },
];

const PRESETS = {
    follower: { completion: 20, rewatch: 10, share: 20, comment: 15, reach: 80, affinity: 10 },
    engage: { completion: 60, rewatch: 70, share: 55, comment: 45, reach: 15, affinity: 60 },
};

const FEED_SIZE = 8; // 피드에 띄우는 상위 개수
const DIVERSITY_TOP = 4; // 다양성 측정 구간 (맨 위 노출)
const START_AFFINITY = 0.35; // 시작 관심값 (중립)
const WATCH_BOOST = 0.22; // 한 번 볼 때 본 주제 상승폭
const DECAY = 0.88; // 안 본 주제가 식는 비율

const topicKeys = Object.keys(TOPICS);

const FeedRank = () => {
    const [weights, setWeights] = useState(PRESETS.engage);
    // 주제별 관심값 (0~1), 시작은 중립
    const [affinity, setAffinity] = useState(() =>
        Object.fromEntries(topicKeys.map((k) => [k, START_AFFINITY]))
    );
    const [watched, setWatched] = useState({}); // id -> 시청 횟수
    const [lastWatchedId, setLastWatchedId] = useState(null);

    const ranked = useMemo(() => {
        const scored = POSTS.map((p) => {
            const metrics = {
                completion: p.completion,
                rewatch: p.rewatch,
                share: p.share,
                comment: p.comment,
                reach: p.reach,
                affinity: affinity[p.topic],
            };
            const score = SIGNALS.reduce(
                (sum, s) => sum + (weights[s.key] / 100) * metrics[s.key],
                0
            );
            return { ...p, metrics, score };
        });
        scored.sort((a, b) => b.score - a.score || a.id - b.id);
        return scored;
    }, [weights, affinity]);

    const maxScore = ranked.length ? ranked[0].score : 1;
    const feed = ranked.slice(0, FEED_SIZE);

    // 다양성: 상위 구간에 등장하는 서로 다른 주제 수
    const diversity = useMemo(() => {
        const top = ranked.slice(0, DIVERSITY_TOP);
        const set = new Set(top.map((p) => p.topic));
        return { count: set.size, max: Math.min(DIVERSITY_TOP, topicKeys.length) };
    }, [ranked]);

    const totalWatched = useMemo(
        () => Object.values(watched).reduce((a, b) => a + b, 0),
        [watched]
    );

    const onWatch = useCallback((post) => {
        setLastWatchedId(post.id);
        setWatched((w) => ({ ...w, [post.id]: (w[post.id] || 0) + 1 }));
        setAffinity((prev) => {
            const next = {};
            topicKeys.forEach((k) => {
                if (k === post.topic) {
                    next[k] = Math.min(1, prev[k] + WATCH_BOOST); // 본 주제는 상승
                } else {
                    next[k] = Math.max(0, prev[k] * DECAY); // 나머지는 식음
                }
            });
            return next;
        });
    }, []);

    const setWeight = useCallback((key, value) => {
        setWeights((w) => ({ ...w, [key]: value }));
    }, []);

    const applyPreset = useCallback((name) => {
        setWeights({ ...PRESETS[name] });
    }, []);

    const reset = useCallback(() => {
        setAffinity(Object.fromEntries(topicKeys.map((k) => [k, START_AFFINITY])));
        setWatched({});
        setLastWatchedId(null);
    }, []);

    const presetIsFollower =
        JSON.stringify(weights) === JSON.stringify(PRESETS.follower);
    const presetIsEngage =
        JSON.stringify(weights) === JSON.stringify(PRESETS.engage);

    const divPct = (diversity.count / diversity.max) * 100;

    return (
        <div className="fr-container">
            <div className="fr-inner">
                <Link to="/" className="fr-back">← 실험실로 돌아가기</Link>

                <header className="fr-header">
                    <h1 className="fr-title">FEED RANK</h1>
                    <p className="fr-sub">{'// 팔로우가 아니라 신호가 피드를 정한다 — 추천 랭킹'}</p>
                </header>

                <div className="fr-stage">
                    {/* 좌측: 랭킹된 피드 */}
                    <section className="fr-left">
                        <div className="fr-feed-head">
                            <span>당신의 피드 <small>후보 {POSTS.length}개 중 상위 {FEED_SIZE}개</small></span>
                            <span className="fr-feed-note">▶ 본다 를 눌러 취향을 학습시켜 보세요</span>
                        </div>

                        <ol className="fr-feed">
                            {feed.map((p, idx) => {
                                const t = TOPICS[p.topic];
                                const wc = watched[p.id] || 0;
                                return (
                                    <li
                                        key={p.id}
                                        className={
                                            'fr-card' +
                                            (p.id === lastWatchedId ? ' fr-card-fresh' : '')
                                        }
                                    >
                                        <span className="fr-rank">{idx + 1}</span>
                                        <div className="fr-card-body">
                                            <div className="fr-card-top">
                                                <span className="fr-chip">{t.emoji} {t.label}</span>
                                                <span className="fr-card-title">{p.title}</span>
                                                {wc > 0 && (
                                                    <span className="fr-watched">{wc}회 시청</span>
                                                )}
                                            </div>
                                            <div className="fr-scorebar">
                                                <div
                                                    className="fr-scorefill"
                                                    style={{ width: `${(p.score / maxScore) * 100}%` }}
                                                />
                                                <span className="fr-scoreval">{p.score.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="fr-watch"
                                            onClick={() => onWatch(p)}
                                        >
                                            ▶ 본다
                                        </button>
                                    </li>
                                );
                            })}
                        </ol>
                    </section>

                    {/* 우측: 신호 가중치 + 지표 */}
                    <aside className="fr-panel">
                        <div className="fr-presets">
                            <button
                                type="button"
                                className={'fr-preset' + (presetIsFollower ? ' fr-preset-on' : '')}
                                onClick={() => applyPreset('follower')}
                            >
                                팔로워 시대
                            </button>
                            <button
                                type="button"
                                className={'fr-preset' + (presetIsEngage ? ' fr-preset-on' : '')}
                                onClick={() => applyPreset('engage')}
                            >
                                참여 시대
                            </button>
                        </div>

                        <div className="fr-signals">
                            {SIGNALS.map((s) => (
                                <div className="fr-signal" key={s.key}>
                                    <label htmlFor={`fr-${s.key}`}>
                                        <span className="fr-signal-name">{s.label}</span>
                                        <b>{weights[s.key]}</b>
                                    </label>
                                    <input
                                        id={`fr-${s.key}`}
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={weights[s.key]}
                                        onChange={(e) => setWeight(s.key, Number(e.target.value))}
                                    />
                                    <span className="fr-signal-hint">{s.hint}</span>
                                </div>
                            ))}
                        </div>

                        <div className="fr-diversity">
                            <div className="fr-div-head">
                                <span>피드 다양성</span>
                                <span className="fr-div-num">
                                    {diversity.count}<small>/{diversity.max} 주제</small>
                                </span>
                            </div>
                            <div className="fr-div-track">
                                <div
                                    className={'fr-div-fill' + (divPct <= 50 ? ' fr-div-low' : '')}
                                    style={{ width: `${divPct}%` }}
                                />
                            </div>
                            <div className="fr-div-foot">
                                {divPct <= 50
                                    ? `필터 버블 — 맨 위가 소수 주제로 쏠렸습니다. (시청 ${totalWatched}회)`
                                    : `시청 ${totalWatched}회 · 맨 위 ${DIVERSITY_TOP}개에 담긴 주제 수`}
                            </div>
                        </div>

                        <div className="fr-affinity">
                            <div className="fr-aff-head">관심 프로파일</div>
                            {topicKeys.map((k) => (
                                <div className="fr-aff-row" key={k}>
                                    <span className="fr-aff-tag">{TOPICS[k].emoji}</span>
                                    <div className="fr-aff-track">
                                        <div
                                            className="fr-aff-fill"
                                            style={{ width: `${affinity[k] * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button type="button" className="fr-reset" onClick={reset}>
                            ⟲ 관심 초기화
                        </button>
                    </aside>
                </div>

                <footer className="fr-foot">
                    <p>
                        {'예전 피드는 '}<b>누구를 팔로우했는가</b>{'로 줄을 세웠다. 지금의 추천 피드는 '}
                        {'팔로우 여부보다 '}<b>행동 신호</b>{'를 본다 — 끝까지 봤는지(완성률), 다시 돌려봤는지'}
                        {'(재시청), 남에게 보냈는지(공유), 댓글을 달았는지. 점수는 이 신호들의 '}<b>가중합</b>
                        {'이고, 피드는 그 점수 순서일 뿐이다.'}
                    </p>
                    <p>
                        {'슬라이더로 신호의 무게를 바꿔 보라. '}<b>팔로워 시대</b>{'를 누르면 팔로워 도달이 피드를 지배하고, '}
                        <b>참여 시대</b>{'를 누르면 작은 계정의 콘텐츠도 완성률·재시청만 높으면 위로 올라온다 — '}
                        {'팔로워 0명도 떡상하는 이유다.'}
                    </p>
                    <p>
                        {'마음에 드는 게시물의 '}<b>▶ 본다</b>{'를 눌러 보라. 그 주제의 '}<b>관심 적합</b>
                        {' 신호가 오르고 나머지는 식는다. 몇 번만 눌러도 피드 '}<b>다양성</b>{'이 빠르게 무너지며 '}
                        {'한 주제로 쏠린다 — 알고리즘이 취향을 학습해 만드는 '}<b>필터 버블</b>{'이다.'}
                    </p>
                    <p className="fr-disclaimer">
                        {'* 특정 플랫폼의 실제 알고리즘이 아니라, 참여 기반 추천 랭킹의 작동 원리를 보여주는 단순화 모델입니다.'}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default FeedRank;
