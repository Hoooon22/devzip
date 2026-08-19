import { useCallback, useEffect, useState } from 'react';

// 사이트 전역 다크모드 훅 — 모든 페이지가 같은 localStorage 키를 공유한다.
// 같은 화면에 떠 있는 다른 인스턴스(상단바·명령 팔레트 등)와는 커스텀 이벤트로 동기화한다.
const DARK_KEY = 'devzip.kernel.dark';
const THEME_EVENT = 'devzip:theme';

const readDark = () => {
    if (typeof window === 'undefined') return false;
    try {
        const raw = window.localStorage.getItem(DARK_KEY);
        return raw === null ? false : JSON.parse(raw) === true;
    } catch {
        return false;
    }
};

const useSiteTheme = () => {
    const [dark, setDark] = useState(readDark);

    useEffect(() => {
        const onTheme = (e) => setDark(e.detail === true);
        window.addEventListener(THEME_EVENT, onTheme);
        return () => window.removeEventListener(THEME_EVENT, onTheme);
    }, []);

    const toggle = useCallback(() => {
        const next = !readDark();
        try { window.localStorage.setItem(DARK_KEY, JSON.stringify(next)); } catch { /* noop */ }
        window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
    }, []);

    return [dark, toggle];
};

export default useSiteTheme;
