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
                backgroundColor: ['#36A2EB', '#E0E0E0'], 
                borderWidth: 0, 
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
        <div className={styles.container}>
            <div className="usage-box">
                <h3>실시간 메모리 사용량</h3>
                <Doughnut data={chartData} options={chartOptions} width={120} height={120} />
                <div className="percentage-container">
                    {memoryUsage}%
                </div>
            </div>
        </div>
    );
};

export default MemoryUsage;
