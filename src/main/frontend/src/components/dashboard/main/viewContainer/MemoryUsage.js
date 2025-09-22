import React, { useEffect, useState } from "react";
import styles from "../../../../assets/css/ViewContainer.module.scss";
import "../../../../assets/css/CPUUsage.scss";
import axios from "../../../../utils/axiosConfig";
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const MemoryUsage = () => {
    const [memoryUsage, setMemoryUsage] = useState(0); // 메모리 사용률 (0 ~ 100%)

    const chartData = {
        labels: ['사용된 메모리', '남은 메모리'],
        datasets: [
            {
                data: [memoryUsage, 100 - memoryUsage], 
                backgroundColor: [
                    memoryUsage > 85 ? '#e53e3e' : memoryUsage > 70 ? '#ed8936' : '#764ba2',
                    '#f7fafc'
                ], 
                borderWidth: 0, 
                hoverBackgroundColor: [
                    memoryUsage > 85 ? '#c53030' : memoryUsage > 70 ? '#dd6b20' : '#553c9a',
                    '#edf2f7'
                ],
            },
        ],
    };

    const chartOptions = {
        cutout: '70%', 
        responsive: false, 
        maintainAspectRatio: false, 
        plugins: {
            legend: {
                display: false 
            }
        }
    };

    const fetchMemoryUsage = async () => {
        try {
            const usedResponse = await axios.get('/actuator/metrics/jvm.memory.used');
            const maxResponse = await axios.get('/actuator/metrics/jvm.memory.max');

            const usedMemory = usedResponse.data.measurements[0]?.value ?? 0; 
            const maxMemory = maxResponse.data.measurements[0]?.value ?? 1; // 0으로 나누는 걸 방지하기 위해 1로 설정

            const usagePercentage = Math.ceil((usedMemory / maxMemory) * 100); 
            setMemoryUsage(usagePercentage); // 💡 사용률 업데이트
            console.log('메모리 사용률 업데이트:', usagePercentage + '%');
        } catch (error) {
            console.error('메모리 사용량 가져오기 실패:', error);
        }
    };

    useEffect(() => {
        fetchMemoryUsage(); 
        const interval = setInterval(fetchMemoryUsage, 5000); // 5초마다 메모리 사용률 갱신
        return () => clearInterval(interval); 
    }, []);

    return (
        <div className="usage-box">
            <h3>🧠 메모리 사용량</h3>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
                <Doughnut data={chartData} options={chartOptions} width={120} height={120} />
                <div style={{
                    position: 'absolute',
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    color: memoryUsage > 85 ? '#e53e3e' : memoryUsage > 70 ? '#ed8936' : '#764ba2'
                }}>
                    {memoryUsage}%
                </div>
            </div>
            <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                background: memoryUsage > 85 ? 'rgba(229, 62, 62, 0.1)' : memoryUsage > 70 ? 'rgba(237, 137, 54, 0.1)' : 'rgba(118, 75, 162, 0.1)',
                color: memoryUsage > 85 ? '#e53e3e' : memoryUsage > 70 ? '#ed8936' : '#764ba2',
                fontWeight: '500',
                fontSize: '0.9rem'
            }}>
                {memoryUsage > 85 ? '⚠️ 높음' : memoryUsage > 70 ? '⚡ 중간' : '✅ 정상'}
            </div>
        </div>
    );
};

export default MemoryUsage;
