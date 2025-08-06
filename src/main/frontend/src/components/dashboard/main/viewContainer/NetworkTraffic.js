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
                label: '📤 송신 (KB)',
                data: trafficData.sent,
                borderColor: '#e53e3e',
                backgroundColor: 'rgba(229, 62, 62, 0.1)',
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: '#e53e3e',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                fill: true
            },
            {
                label: '📥 수신 (KB)',
                data: trafficData.received,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                fill: true
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: {
                        size: 12,
                        weight: '500'
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#2d3748',
                bodyColor: '#4a5568',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: '⏰ 시간 (초)',
                    color: '#4a5568',
                    font: {
                        size: 12,
                        weight: '500'
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                    borderColor: 'rgba(0, 0, 0, 0.1)'
                }
            },
            y: {
                title: {
                    display: true,
                    text: '📊 KB (킬로바이트)',
                    color: '#4a5568',
                    font: {
                        size: 12,
                        weight: '500'
                    }
                },
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                    borderColor: 'rgba(0, 0, 0, 0.1)'
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    };

    return (
        <div className={styles.container}>
            <div style={{ width: '100%', height: '300px' }}>
                <h3>🌐 네트워크 트래픽</h3>
                <Line data={chartData} options={chartOptions} />
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    background: 'rgba(102, 126, 234, 0.05)',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    color: '#4a5568'
                }}>
                    <span>📈 실시간 모니터링</span>
                    <span>🔄 5초마다 업데이트</span>
                </div>
            </div>
        </div>
    );
};

export default NetworkTraffic;
