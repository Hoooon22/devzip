import React, { useEffect } from 'react';
import axios from 'axios';

const IPFetcher = ({ onIPFetched }) => {
    useEffect(() => {
        fetchFormattedIP();
    }, []);

    const fetchFormattedIP = async () => {
        try {
            const response = await axios.get('/api/ip'); // Spring Boot 서버의 URL로 변경
            onIPFetched(response.data);
        } catch (error) {
            console.error('Error fetching IP:', error);
            onIPFetched('Unknown'); // IP를 가져올 수 없는 경우 처리
        }
    };

    return null; // IP 주소를 화면에 표시하지 않으므로 null 반환
};

export default IPFetcher;
