import React, { useEffect, useState } from "react";
import styles from "../../../../assets/css/ViewContainer.module.scss";
import axios from "../../../../utils/axiosConfig";

const ViewTop = () => {
    const [serverStart, setServerStart] = useState({}); // 초기값을 빈 객체로 설정
    const [uptime, setUptime] = useState(0); // 서버 구동 시간 (초 단위)

    const getRecentServerStart = async () => {
        try {
            const response = await axios.get('/api/v1/serverstarts/recent');
            const data = Array.isArray(response.data) ? response.data[0] : response.data; // 배열이면 첫 번째 항목 가져오기
            setServerStart(data);
            console.log('Fetched Recent ServerStart:', data);
        } catch (error) {
            console.error('Error fetching ServerStart:', error);
        }
    };

    // 서버 구동 시간 계산 함수
    const calculateUptime = () => {
        if (serverStart.date) {
            const startTime = new Date(serverStart.date).getTime();
            const currentTime = new Date().getTime();
            const diff = currentTime - startTime; // 밀리초 단위 차이
            const uptimeInSeconds = Math.floor(diff / 1000); // 초 단위로 변환
            setUptime(uptimeInSeconds);
        }
    };

    useEffect(() => {
        getRecentServerStart();
    }, []);

    useEffect(() => {
        if (serverStart.date) {
            const interval = setInterval(() => {
                calculateUptime(); // 5초마다 구동 시간 갱신
            }, 5000); // 5초마다 갱신

            return () => clearInterval(interval); // 컴포넌트 언마운트 시 인터벌 정리
        }
    }, [serverStart]);

    // 구동 시간 포맷 (HH:MM:SS)
    const formatUptime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.container}>
            {serverStart && serverStart.id ? (
                <div>
                    <h3>최근 서버 시작 정보</h3>
                    <p><strong>서버 ID:</strong> {serverStart.id}</p>
                    <p><strong>날짜:</strong> {new Date(serverStart.date).toLocaleString()}</p>
                    <p style={{ fontWeight: 'bold', fontSize: '1.2em', color: 'green' }}>
                        <strong>서버 구동 시간:</strong> {formatUptime(uptime)}
                    </p>
                </div>
            ) : (
                <p>로딩 중...</p> // 데이터를 불러오는 중일 때 표시
            )}
        </div>
    );
};

export default ViewTop;
