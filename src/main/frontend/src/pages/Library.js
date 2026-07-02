import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/Library.css';

// 자료실에 게시하는 학습 자료/문서 목록.
// href가 /docs/* 인 항목은 정적 HTML 파일을 새 탭으로 열고,
// internal: true 인 항목은 SPA 내부 라우트로 이동한다.
const docs = [
    {
        title: '실험 계기 연대기',
        description:
            '실험실 페이지들이 어떤 사건·이슈·궁금증에서 출발했는지 시간·프로젝트별로 정리한 연대기.',
        href: '/lab-origins',
        internal: true,
        icon: '🧭',
        category: '실험 아카이브',
        date: '2026.06.11~',
        tags: ['실험실', '연대기', '계기'],
    },
    {
        title: 'GCP PCA v6.1 · 압축 학습 콘솔',
        description:
            'Professional Cloud Architect 시험 대비 — 신호어·결정 트리·함정·셀프 퀴즈를 한 곳에 압축한 인터랙티브 학습 자료.',
        href: '/docs/gcp-pca.html',
        icon: '☁️',
        category: '클라우드 자격증',
        date: '2025.10.30~',
        tags: ['GCP', 'PCA', '시험 대비'],
    },
];

// 카드 공통 내부 마크업 (내부 라우트/외부 문서 공용, 일반 헬퍼 함수)
const renderDocCardBody = (doc) => (
    <>
        <div className="doc-top">
            <span className="doc-icon" aria-hidden="true">{doc.icon}</span>
            <span className="doc-cat">{doc.category}</span>
        </div>
        <h2>{doc.title}</h2>
        <p>{doc.description}</p>
        <div className="doc-tags">
            {doc.tags.map((tag) => (
                <span key={tag}>{tag}</span>
            ))}
        </div>
        <div className="doc-foot">
            <span className="doc-date">{doc.date}</span>
            <span className="doc-open">열기 →</span>
        </div>
    </>
);

const Library = () => {
    return (
        <div className="library-page">
            <Helmet>
                <title>자료실 | DevZip</title>
                <meta name="description" content="DevZip 자료실 — 공부하며 정리한 학습 자료와 요약 문서를 모아두는 공간." />
            </Helmet>

            <div className="library-wrap">
                <header className="library-head">
                    <Link className="back-link" to="/">← 홈으로</Link>
                    <span className="eyebrow">★ study archive</span>
                    <h1>자료실</h1>
                    <p>공부하며 정리한 학습 자료와 요약 문서를 모아두는 공간입니다.</p>
                </header>

                <div className="doc-grid">
                    {docs.map((doc) => (
                        doc.internal ? (
                            <Link key={doc.href} className="doc-card" to={doc.href}>
                                {renderDocCardBody(doc)}
                            </Link>
                        ) : (
                            <a
                                key={doc.href}
                                className="doc-card"
                                href={doc.href}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {renderDocCardBody(doc)}
                            </a>
                        )
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Library;
