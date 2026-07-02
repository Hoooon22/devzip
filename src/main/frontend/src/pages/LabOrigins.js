import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import labOrigins from '../data/labOrigins';
import '../styles/LabOrigins.css';

// 실험 계기 연대기 — 각 실험실 페이지가 "어떤 사건/이슈에서 출발했는지"를
// 시간순(월별 타임라인) + 프로젝트(카테고리) 필터로 정리하는 자료실 문서 페이지.
// 데이터는 data/labOrigins.js 에서 관리한다. 새 실험을 추가하면 그 파일에 항목을 추가할 것.

const ALL = '전체';

const LabOrigins = () => {
    const [cat, setCat] = useState(ALL);

    // 카테고리 목록 (데이터 등장 순서 유지) + 항목 수
    const cats = useMemo(() => {
        const counts = new Map();
        labOrigins.forEach((o) => counts.set(o.category, (counts.get(o.category) || 0) + 1));
        return [[ALL, labOrigins.length], ...counts.entries()];
    }, []);

    // 최신순 정렬 후 월별 그룹핑
    const months = useMemo(() => {
        const filtered = labOrigins
            .filter((o) => cat === ALL || o.category === cat)
            .slice()
            .sort((a, b) => (a.date < b.date ? 1 : -1));
        const groups = new Map();
        filtered.forEach((o) => {
            const key = o.date.slice(0, 7); // YYYY-MM
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(o);
        });
        return [...groups.entries()];
    }, [cat]);

    return (
        <div className="origins-page">
            <Helmet>
                <title>실험 계기 연대기 | DevZip 자료실</title>
                <meta name="description" content="DevZip 실험실 페이지들이 어떤 사건과 이슈에서 출발했는지 시간·프로젝트별로 정리한 연대기." />
            </Helmet>

            <div className="origins-wrap">
                <header className="origins-head">
                    <Link className="back-link" to="/library">← 자료실</Link>
                    <Link className="back-link" to="/">홈</Link>
                    <span className="eyebrow">★ lab origins</span>
                    <h1>실험 계기 연대기</h1>
                    <p>
                        실험실 페이지 하나하나가 어떤 사건·이슈·궁금증에서 출발했는지 기록한 정리본입니다.
                        시간순으로 나열되며, 카테고리 버튼으로 프로젝트 계열별로 모아 볼 수 있습니다.
                    </p>
                </header>

                <div className="origins-filter" role="group" aria-label="카테고리 필터">
                    {cats.map(([name, count]) => (
                        <button
                            key={name}
                            type="button"
                            className={cat === name ? 'on' : ''}
                            aria-pressed={cat === name}
                            onClick={() => setCat(name)}
                        >
                            {name}<span className="cnt">({count})</span>
                        </button>
                    ))}
                </div>

                {months.map(([month, items]) => (
                    <section key={month} className="origins-month">
                        <h2>{month.replace('-', '.')}</h2>
                        <ul className="origins-list">
                            {items.map((o) => (
                                <li key={o.link} className="origin-card">
                                    <div className="origin-top">
                                        <span className="origin-icon" aria-hidden="true">{o.icon}</span>
                                        <h3>{o.name}</h3>
                                        {o.subtitle && <span className="origin-sub">{o.subtitle}</span>}
                                        <span className="origin-cat">{o.category}</span>
                                        <span className="origin-date">{o.date}</span>
                                    </div>
                                    <p><b>계기 — </b>{o.origin}</p>
                                    <div className="origin-foot">
                                        <div className="origin-tags">
                                            {o.tags.map((tag) => (
                                                <span key={tag}>{tag}</span>
                                            ))}
                                        </div>
                                        <Link className="origin-go" to={o.link}>실험 열기 →</Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default LabOrigins;
