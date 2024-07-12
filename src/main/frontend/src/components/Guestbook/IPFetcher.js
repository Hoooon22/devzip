import React, { useState, useEffect } from 'react';
import axios from 'axios';

const IPFetcher = ({ onIPFetched }) => {
    useEffect(() => {
        fetchFormattedIP();
    }, []);

    const fetchFormattedIP = async () => {
        try {
            const response = await axios.get('/api/ip'); // 스프링 부트 서버의 IP 주소 요청 URL
            onIPFetched(response.data);
        } catch (error) {
            console.error('Error fetching IP:', error);
            onIPFetched("Error fetching IP"); // 오류 발생 시 적절한 오류 메시지 전달
        }
    };

    return null; // IP 주소를 화면에 표시하지 않으므로 null 반환
};

export default IPFetcher;
