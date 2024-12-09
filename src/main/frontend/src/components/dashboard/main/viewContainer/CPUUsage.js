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
        plugins: {
            legend: {
                display: false 
            }
        }
    };

    const fetchCPUUsage = async () => {
        try {
            const response = await axios.get('/actuator/cpu-usage');
            const usage = response.data.usage; 
            setCpuUsage(usage);
            console.log('CPU 사용량 업데이트:', usage);
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
                <div className="chart-container">
                    <Doughnut data={chartData} options={chartOptions} />
                </div>

                <div className="percentage-container">
                    {cpuUsage}%
                </div>
            </div>
        </div>
    );
};

export default CPUUsage;