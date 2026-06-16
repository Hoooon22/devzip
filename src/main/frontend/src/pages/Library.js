import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/Library.css';

// 자료실에 게시하는 학습 자료/문서 목록.
// href가 /docs/* 인 항목은 정적 HTML 파일을 새 탭으로 연다.
const docs = [
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
                        <a
                            key={doc.href}
                            className="doc-card"
                            href={doc.href}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
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
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Library;
