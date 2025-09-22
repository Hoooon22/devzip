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
                backgroundColor: [
                    cpuUsage > 80 ? '#e53e3e' : cpuUsage > 60 ? '#ed8936' : '#667eea',
                    '#f7fafc'
                ], 
                borderWidth: 0, 
                hoverBackgroundColor: [
                    cpuUsage > 80 ? '#c53030' : cpuUsage > 60 ? '#dd6b20' : '#5a67d8',
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
        <div className="usage-box">
            <h3>💻 CPU 사용량</h3>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem' }}>
                <Doughnut data={chartData} options={chartOptions} width={120} height={120} />
                <div style={{
                    position: 'absolute',
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    color: cpuUsage > 80 ? '#e53e3e' : cpuUsage > 60 ? '#ed8936' : '#667eea'
                }}>
                    {cpuUsage}%
                </div>
            </div>
            <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                background: cpuUsage > 80 ? 'rgba(229, 62, 62, 0.1)' : cpuUsage > 60 ? 'rgba(237, 137, 54, 0.1)' : 'rgba(102, 126, 234, 0.1)',
                color: cpuUsage > 80 ? '#e53e3e' : cpuUsage > 60 ? '#ed8936' : '#667eea',
                fontWeight: '500',
                fontSize: '0.9rem'
            }}>
                {cpuUsage > 80 ? '⚠️ 높음' : cpuUsage > 60 ? '⚡ 중간' : '✅ 정상'}
            </div>
        </div>
    );
};

export default CPUUsage;
