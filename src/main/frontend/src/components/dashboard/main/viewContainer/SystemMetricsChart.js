import React, { useEffect, useState, useRef } from "react";
import axios from "../../../../utils/axiosConfig";
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const SystemMetricsChart = () => {
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [
            {
                label: 'CPU 사용률 (%)',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
            },
            {
                label: '메모리 사용률 (%)',
                data: [],
                borderColor: '#764ba2',
                backgroundColor: 'rgba(118, 75, 162, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#764ba2',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
            }
        ]
    });

    const dataPointsRef = useRef([]);
    const maxDataPoints = 30; // 최대 30개 데이터 포인트 (1분간 데이터)

    const fetchSystemMetrics = async () => {
        try {
            const [cpuResponse, memoryResponse] = await Promise.all([
                axios.get('/api/system/cpu'),
                axios.get('/api/system/memory')
            ]);

            const currentTime = new Date();
            const timeLabel = currentTime.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            const cpuUsage = cpuResponse.data.success ?
                Math.round(cpuResponse.data.cpuUsage || 0) : 0;
            const memoryUsage = memoryResponse.data.success ?
                Math.round(memoryResponse.data.memoryUsage || 0) : 0;

            // 새로운 데이터 포인트 추가
            const newDataPoint = {
                time: timeLabel,
                cpu: cpuUsage,
                memory: memoryUsage,
                timestamp: currentTime.getTime()
            };

            dataPointsRef.current.push(newDataPoint);

            // 최대 데이터 포인트 수 제한
            if (dataPointsRef.current.length > maxDataPoints) {
                dataPointsRef.current = dataPointsRef.current.slice(-maxDataPoints);
            }

            // 차트 데이터 업데이트
            setChartData(prevData => ({
                ...prevData,
                labels: dataPointsRef.current.map(point => point.time),
                datasets: [
                    {
                        ...prevData.datasets[0],
                        data: dataPointsRef.current.map(point => point.cpu)
                    },
                    {
                        ...prevData.datasets[1],
                        data: dataPointsRef.current.map(point => point.memory)
                    }
                ]
            }));

            console.log(`시스템 메트릭 업데이트: CPU ${cpuUsage}%, 메모리 ${memoryUsage}%`);

        } catch (error) {
            console.error('시스템 메트릭 가져오기 실패:', error);
        }
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        size: 12
                    },
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 15
                }
            },
            title: {
                display: true,
                text: '실시간 시스템 사용률',
                font: {
                    size: 16,
                    weight: 'bold'
                },
                padding: {
                    top: 10,
                    bottom: 20
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#667eea',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y}%`;
                    }
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: '시간',
                    font: {
                        size: 12,
                        weight: 'bold'
                    }
                },
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.1)',
                    drawBorder: true,
                },
                ticks: {
                    maxTicksLimit: 8,
                    font: {
                        size: 10
                    }
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: '사용률 (%)',
                    font: {
                        size: 12,
                        weight: 'bold'
                    }
                },
                min: 0,
                max: 100,
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.1)',
                    drawBorder: true,
                },
                ticks: {
                    stepSize: 20,
                    font: {
                        size: 10
                    }
                }
            }
        },
        elements: {
            line: {
                tension: 0.4
            },
            point: {
                radius: 3,
                hoverRadius: 5
            }
        },
        animation: {
            duration: 500,
            easing: 'easeInOutQuart'
        }
    };

    useEffect(() => {
        // 초기 데이터 로드
        fetchSystemMetrics();

        // 2초마다 데이터 업데이트
        const interval = setInterval(fetchSystemMetrics, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
        }}>
            <div style={{ height: '400px', width: '100%' }}>
                <Line data={chartData} options={chartOptions} />
            </div>
            <div style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: '#f7fafc',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#4a5568',
                textAlign: 'center'
            }}>
                💡 실시간으로 2초마다 업데이트됩니다. 최근 1분간의 데이터를 표시합니다.
            </div>
        </div>
    );
};

export default SystemMetricsChart;