import React, { useEffect, useState } from "react";
import styles from "../../../../assets/css/ViewTop.module.scss";
import axios from "../../../../utils/axiosConfig";

const ViewTop = () => {
    const [serverStart, setServerStart] = useState([]);
    
    const getRecentServerStart = async () => {
        try {
            const response = await axios.get('/api/v1/serverstarts/recent');
            setServerStart(response.data);
            console.log('Fetched Recent ServerStart:', response.data);
            console.log(response.data)
        } catch (error) {
            console.error('Error fetching ServerStart:', error);
        }
    };

    // 컴포넌트가 렌더링될 때 데이터 가져오기
    useEffect(() => {
        getRecentServerStart();
    }, []);

    return (
        <div className={styles.container}>
            {serverStart ? (
                <div>
                    <h3>최근 서버 시작 정보</h3>
                    <p><strong>서버 ID:</strong> {serverStart.id}</p>
                    <p><strong>날짜:</strong> {serverStart.date}</p>
                    <p><strong>상태:</strong> {serverStart.status}</p>
                </div>
            ) : (
                <p>로딩 중...</p> // 데이터를 불러오는 중일 때 표시
            )}
        </div>
    );
};

export default ViewTop;