// IPFetcher.jsx 파일
import React, { useEffect } from 'react';
import axios from 'axios';

const IPFetcher = ({ onIPFetched }) => {
    useEffect(() => {
        const fetchIP = async () => {
            try {
                const response = await axios.get('/api/ip'); // 서버에서 IP 주소를 가져오는 API 엔드포인트
                const ip = response.data.ip; // 예시: 서버에서 IP 주소를 JSON 형식으로 반환하는 경우
                onIPFetched(ip); // 가져온 IP 주소를 부모 컴포넌트로 전달
            } catch (error) {
                console.error('Error fetching IP address:', error);
            }
        };

        fetchIP();
    }, [onIPFetched]);

    return null;
};

export default IPFetcher;
