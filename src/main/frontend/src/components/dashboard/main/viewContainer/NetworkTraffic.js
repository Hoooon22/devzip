import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import axios from "../../../../utils/axiosConfig";
import styles from "../../../../assets/css/ViewContainer.module.scss";
import "../../../../assets/css/CPUUsage.scss";
import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    LinearScale,
    Title,
    Tooltip,
    Legend,
    CategoryScale
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale);

const NetworkTraffic = () => {
    const [trafficData, setTrafficData] = useState({
        timestamps: Array(12).fill('0s'), // x축 시간 (최대 12개, 5초마다 1분간)
        sent: Array(12).fill(0),         // 송신 데이터 (KB)
        received: Array(12).fill(0)      // 수신 데이터 (KB)
    });

    /**
     * 네트워크 트래픽을 가져와서 state를 업데이트합니다.
     */
    const fetchNetworkTraffic = async () => {
        try {
            // 각각의 API 호출
            const sentResponse = await axios.get('/metrics/network.traffic.sent');
            const receivedResponse = await axios.get('/metrics/network.traffic.received');

            // 송신 데이터 추출 (Byte -> KB로 변환)
            const sentValue = sentResponse.data ?? 0;
            const sentKB = (sentValue / 1024).toFixed(2); // Byte -> KB

            // 수신 데이터 추출 (Byte -> KB로 변환)
            const receivedValue = receivedResponse.data ?? 0;
            const receivedKB = (receivedValue / 1024).toFixed(2); // Byte -> KB

            // 기존 데이터에 새 값 추가
            setTrafficData((prevData) => {
                const newTimestamps = [...prevData.timestamps.slice(1), `${new Date().getSeconds()}s`]; // 현재 초 추가
                const newSentData = [...prevData.sent.slice(1), parseFloat(sentKB)];
                const newReceivedData = [...prevData.received.slice(1), parseFloat(receivedKB)];

                return {
                    timestamps: newTimestamps,
                    sent: newSentData,
                    received: newReceivedData
                };
            });

            console.log(`송신: ${sentKB} KB, 수신: ${receivedKB} KB`);
        } catch (error) {
            console.error('네트워크 트래픽 가져오기 실패:', error);
        }
    };

    /**
     * 컴포넌트가 마운트되었을 때 네트워크 트래픽을 주기적으로 가져옵니다.
     */
    useEffect(() => {
        fetchNetworkTraffic();
        const interval = setInterval(fetchNetworkTraffic, 5000); // 5초마다 데이터 갱신
        return () => clearInterval(interval);
    }, []);

    /**
     * Chart.js에 전달할 차트 데이터와 옵션
     */
    const chartData = {
        labels: trafficData.timestamps, // x축에 시간 정보
        datasets: [
            {
                label: '송신 (KB)',
                data: trafficData.sent, // y축 데이터 (송신)
                borderColor: 'red',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.4, // 곡선 효과
                borderWidth: 2
            },
            {
                label: '수신 (KB)',
                data: trafficData.received, // y축 데이터 (수신)
                borderColor: 'blue',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                tension: 0.4, // 곡선 효과
                borderWidth: 2
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: '시간 (초)',
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'KB (킬로바이트)',
                },
                beginAtZero: true
            }
        }
    };

    return (
        <div className={styles.container}>
            <div style={{ width: '100%', height: '300px' }}>
                <h3>네트워크 트래픽 (1분간의 송신/수신)</h3>
                <Line data={chartData} options={chartOptions} />
            </div>
        </div>
    );
};

export default NetworkTraffic;
