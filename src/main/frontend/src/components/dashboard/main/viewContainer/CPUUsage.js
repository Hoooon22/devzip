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

const CPUUsage = () => {
    const [cpuUsage, setCpuUsage] = useState(0); 
    
    const chartData = {
        labels: ['사용된 CPU', '남은 CPU'],
        datasets: [
            {
                data: [cpuUsage, 100 - cpuUsage], 
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

    const fetchCPUUsage = async () => {
        try {
            const response = await axios.get('/actuator/metrics/system.cpu.usage');
            const rawValue = response.data.measurements[0]?.value; 
            const value = rawValue !== undefined ? Math.ceil(rawValue * 100) : 0; 
            setCpuUsage(value);
            console.log('CPU 사용량 업데이트:', value);
        } catch (error) {
            console.error('CPU 사용량 가져오기 실패:', error);
        }
    };

    useEffect(() => {
        fetchCPUUsage(); 
        const interval = setInterval(fetchCPUUsage, 5000); 
        return () => clearInterval(interval); 
    }, []);

    return (
        <div className={styles.container}>
            <div className="usage-box">
                <h3>실시간 CPU 사용량</h3>
                <Doughnut data={chartData} options={chartOptions} width={120} height={120} />
                <div className="percentage-container">
                    {cpuUsage}%
                </div>
            </div>
        </div>
    );
};

export default CPUUsage;
