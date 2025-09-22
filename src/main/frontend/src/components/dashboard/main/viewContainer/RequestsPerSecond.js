import React, { useEffect, useState, useRef } from "react";
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
    CategoryScale,
    TimeScale
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale, TimeScale);

const UPDATE_INTERVAL = 2000; // 2초

const RequestsPerSecond = () => {
    const [rpsData, setRpsData] = useState({
        labels: [],
        values: []
    });
    const lastRequestCount = useRef(0);
    const lastRequestTime = useRef(Date.now());

    const fetchRPS = async () => {
        try {
            const response = await axios.get('/actuator/metrics/http.server.requests');
            const currentRequestCount = response.data.measurements.find(m => m.statistic === 'COUNT')?.value ?? 0;
            const currentTime = Date.now();

            const countDelta = currentRequestCount - lastRequestCount.current;
            const timeDeltaInSeconds = (currentTime - lastRequestTime.current) / 1000;

            // 초당 요청 수 계산
            const rps = timeDeltaInSeconds > 0 ? (countDelta / timeDeltaInSeconds).toFixed(2) : 0;

            setRpsData(prevData => {
                const newLabels = [...prevData.labels, new Date().toLocaleTimeString()];
                if (newLabels.length > 12) newLabels.shift(); // 최대 12개 데이터 유지 (1분)

                const newValues = [...prevData.values, rps];
                if (newValues.length > 12) newValues.shift();

                return { labels: newLabels, values: newValues };
            });

            // 다음 계산을 위해 현재 값 저장
            lastRequestCount.current = currentRequestCount;
            lastRequestTime.current = currentTime;

            console.log(`RPS: ${rps}`);
        } catch (error) {
            console.error('RPS 데이터 가져오기 실패:', error);
        }
    };

    useEffect(() => {
        const interval = setInterval(fetchRPS, UPDATE_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    const chartData = {
        labels: rpsData.labels,
        datasets: [
            {
                label: '🚀 초당 요청 수 (RPS)',
                data: rpsData.values,
                borderColor: '#38A169',
                backgroundColor: 'rgba(56, 161, 105, 0.1)',
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: '#38A169',
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
                    font: { size: 12, weight: '500' }
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
                    text: '⏰ 시간',
                    color: '#4a5568',
                    font: { size: 12, weight: '500' }
                },
                grid: { color: 'rgba(0, 0, 0, 0.05)' }
            },
            y: {
                title: {
                    display: true,
                    text: '📊 초당 요청 수',
                    color: '#4a5568',
                    font: { size: 12, weight: '500' }
                },
                beginAtZero: true,
                grid: { color: 'rgba(0, 0, 0, 0.05)' }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    };

    return (
        <div style={{ width: '100%', height: '300px' }}>
            <h3>🚀 서버 요청 트렌드 (RPS)</h3>
            <Line data={chartData} options={chartOptions} />
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: 'rgba(56, 161, 105, 0.05)',
                borderRadius: '12px',
                fontSize: '0.85rem',
                color: '#4a5568'
            }}>
                <span>📈 실시간 트래픽 모니터링</span>
                <span>🔄 5초마다 업데이트</span>
            </div>
        </div>
    );
};

export default RequestsPerSecond;
