import React from 'react';
import PropTypes from 'prop-types';

// 프로젝트 썸네일용 모노(선화) SVG 아이콘 세트.
// 이모지 대신 한눈에 인식되는 아이콘을 쓴다. 색은 currentColor 를 따른다.
// 매핑 우선순위: 링크별 지정(LINK_ICONS) → 카테고리 마지막 세그먼트(CATEGORY_ICONS) → 기본(box).

const GLYPHS = {
    // CPU 칩 — AI/모델
    chip: (
        <>
            <rect x="7" y="7" width="10" height="10" />
            <path d="M9 4v3 M15 4v3 M9 17v3 M15 17v3 M4 9h3 M4 15h3 M17 9h3 M17 15h3" />
        </>
    ),
    // 플라스크 — 실험/시뮬레이션
    flask: (
        <>
            <path d="M10 3h4 M10 3v5 L5.4 18.2 A2 2 0 0 0 7.2 21 h9.6 a2 2 0 0 0 1.8-2.8 L14 8 V3" />
            <path d="M7.6 15h8.8" />
        </>
    ),
    // 노드 연결 — 네트워크/API
    network: (
        <>
            <circle cx="5.5" cy="6" r="2.2" />
            <circle cx="18.5" cy="6" r="2.2" />
            <circle cx="12" cy="18" r="2.2" />
            <path d="M7.7 6h8.6 M6.6 8 l4.3 8 M17.4 8 l-4.3 8" />
        </>
    ),
    // 이미지 — 그래픽스
    image: (
        <>
            <rect x="3.5" y="5" width="17" height="14" rx="1.2" />
            <circle cx="8.6" cy="9.6" r="1.5" />
            <path d="M4.5 17 l4.6-4.6 3.6 3.6 3-3 4.3 4.3" />
        </>
    ),
    // 음표 — 사운드/음악
    note: (
        <>
            <path d="M9 17.5 V6 l8-2.4 v11.4" />
            <circle cx="7" cy="17.5" r="2.2" />
            <circle cx="15" cy="15" r="2.2" />
        </>
    ),
    // 게임패드 — 게임
    gamepad: (
        <>
            <rect x="3" y="8" width="18" height="9" rx="4.5" />
            <path d="M8 10.5v4 M6 12.5h4" />
            <circle cx="15.3" cy="11.5" r="0.6" />
            <circle cx="17.8" cy="13.8" r="0.6" />
        </>
    ),
    // 지구본 — 웹/외부
    globe: (
        <>
            <circle cx="12" cy="12" r="8.5" />
            <ellipse cx="12" cy="12" rx="4" ry="8.5" />
            <path d="M3.5 12h17" />
        </>
    ),
    // 눈 — 인지/지각
    eye: (
        <>
            <path d="M2.5 12 C6 6.5 18 6.5 21.5 12 C18 17.5 6 17.5 2.5 12 Z" />
            <circle cx="12" cy="12" r="2.8" />
        </>
    ),
    // 터미널 — 개발도구/CLI
    terminal: (
        <>
            <rect x="3" y="5" width="18" height="14" rx="1.2" />
            <path d="M7 10 l3 2.5 -3 2.5 M12.5 15H17" />
        </>
    ),
    // 레이어 — 생산성/스택
    layers: (
        <>
            <path d="M12 3 L21 8 12 13 3 8 Z" />
            <path d="M3 12.5 l9 5 9-5 M3 17 l9 5 9-5" />
        </>
    ),
    // 막대 차트 — 분석/로그
    chart: (
        <>
            <path d="M3.5 20.5h17" />
            <path d="M6.5 20 V12 M12 20 V5.5 M17.5 20 V9" />
        </>
    ),
    // 게이지 — 대시보드/관리자
    gauge: (
        <>
            <path d="M4 16.5 a8 8 0 1 1 16 0" />
            <path d="M12 16.5 L16.2 10.5" />
            <circle cx="12" cy="16.5" r="1.2" />
        </>
    ),
    // 말풍선 — 채팅/협업
    chat: (
        <>
            <path d="M4 5 h16 v11 h-8.5 L7 20 v-4 H4 Z" />
            <path d="M8 9.5h8 M8 12.5h5" />
        </>
    ),
    // 책 — 문서/교육
    book: (
        <>
            <path d="M4 19.5 V5 a2 2 0 0 1 2-2 h14 v14 H6.5 A2.5 2.5 0 0 0 4 19.5 A2.5 2.5 0 0 0 6.5 22 H20" />
        </>
    ),
    // 경로 — 지도/길찾기
    route: (
        <>
            <circle cx="6" cy="6" r="2.4" />
            <circle cx="18" cy="18" r="2.4" />
            <path d="M6 8.4 V13 a4 4 0 0 0 4 4 h5.6" />
        </>
    ),
    // 웃는 얼굴 — 유머
    smile: (
        <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M8.5 14.5 c1.2 1.6 5.8 1.6 7 0" />
            <path d="M9.2 9.4 v0.01 M14.8 9.4 v0.01" strokeWidth="2.4" />
        </>
    ),
    // 분기 합류 — 흐름/브랜치
    branch: (
        <>
            <circle cx="6" cy="5" r="2.2" />
            <circle cx="6" cy="19" r="2.2" />
            <circle cx="18" cy="12" r="2.2" />
            <path d="M6 7.2 v9.6 M7.8 6.4 C13 8.4 13 15.6 7.8 17.6 M13 12 h2.8" />
        </>
    ),
    // 수신함 — 수집/보관
    inbox: (
        <>
            <path d="M3.5 13 h5 l1.5 2.5 h4 L15.5 13 h5 v6.5 h-17 Z" />
            <path d="M5.5 13 L7.3 5 h9.4 l1.8 8" />
        </>
    ),
    // 구름 — 클라우드
    cloud: (
        <>
            <path d="M7 18 h10 a4 4 0 0 0 0.4-7.98 A5.5 5.5 0 0 0 6.6 8.6 A4.7 4.7 0 0 0 7 18 Z" />
        </>
    ),
    // 집 — 홈 이동
    home: (
        <>
            <path d="M3.5 11 L12 3.8 20.5 11" />
            <path d="M6 10 v10 h12 V10" />
            <path d="M10 20 v-5.5 h4 V20" />
        </>
    ),
    // 상자 — 기본값
    box: (
        <>
            <path d="M12 3 L20 7.5 v9 L12 21 4 16.5 v-9 Z" />
            <path d="M4 7.5 L12 12 20 7.5 M12 12 V21" />
        </>
    ),
};

// 서비스/특수 페이지는 정체성이 뚜렷하므로 링크별로 직접 지정한다.
const LINK_ICONS = {
    '/traceboard': 'chart',
    '/access-logs': 'chart',
    '/dashboard': 'gauge',
    '/trendchat': 'chat',
    '/livechat': 'chat',
    '/Guestbook': 'book',
    '/chaotic-music-box': 'note',
    '/hopperbox': 'inbox',
    '/commandstack': 'terminal',
    '/conflux': 'branch',
    '/chora': 'route',
    '/physics-quiz': 'book',
    '/Joke': 'smile',
    '/apiPage': 'network',
    '/api-experiment': 'network',
    '/pathfind': 'route',
    '/steganos': 'image',
    '/ghost-feed': 'gamepad',
    'https://www.stoneinwell.com': 'globe',
};

// 카테고리 마지막 세그먼트("실험/AI" → "AI") 기준 매핑.
const CATEGORY_ICONS = {
    'AI': 'chip',
    '시뮬레이션': 'flask',
    '네트워크': 'network',
    '그래픽스': 'image',
    '사운드': 'note',
    '음악': 'note',
    '게임': 'gamepad',
    '웹': 'globe',
    '인지': 'eye',
    '개발도구': 'terminal',
    '생산성도구': 'layers',
    '생산성': 'layers',
    '협업': 'chat',
    '관리자용': 'gauge',
    '교육': 'book',
};

const lastSegment = (raw) => {
    if (!raw) return '';
    const parts = raw.split('/').filter(Boolean);
    return parts[parts.length - 1];
};

export const iconNameFor = (link, category) =>
    LINK_ICONS[link] || CATEGORY_ICONS[lastSegment(category)] || 'box';

// 이름으로 직접 그리는 저수준 컴포넌트 (자료실 등 프로젝트 외 용도).
export const Icon = ({ name, size = 22, className = '' }) => (
    <svg
        className={`pj-icon ${className}`.trim()}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        {GLYPHS[name] || GLYPHS.box}
    </svg>
);

Icon.propTypes = {
    name: PropTypes.string.isRequired,
    size: PropTypes.number,
    className: PropTypes.string,
};

// 프로젝트 카드/목록용 — 링크·카테고리로 아이콘을 자동 결정한다.
const ProjectIcon = ({ link, category, size = 22, className = '' }) => (
    <Icon name={iconNameFor(link, category)} size={size} className={className} />
);

ProjectIcon.propTypes = {
    link: PropTypes.string,
    category: PropTypes.string,
    size: PropTypes.number,
    className: PropTypes.string,
};

export default ProjectIcon;
