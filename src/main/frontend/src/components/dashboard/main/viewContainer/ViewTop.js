import React, { useEffect, useState } from "react";
import styles from "../../../../assets/css/ViewTop.module.scss";
import axios from "../../../../utils/axiosConfig";

const ViewTop = () => {
    const [serverStart, setServerStart] = useState({}); // 초기값을 빈 객체로 설정

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

    useEffect(() => {
        getRecentServerStart();
    }, []);

    return (
        <div className={styles.container}>
            {serverStart && serverStart.id ? ( // serverStart.id가 있는 경우만 렌더링
                <div>
                    <h3>최근 서버 시작 정보</h3>
                    <p><strong>서버 ID:</strong> {serverStart.id}</p>
                    <p><strong>날짜:</strong> {new Date(serverStart.date).toLocaleString()}</p>
                </div>
            ) : (
                <p>로딩 중...</p> // 데이터를 불러오는 중일 때 표시
            )}
        </div>
    );
};

export default ViewTop;
