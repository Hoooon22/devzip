import React, { useState, useEffect, useRef } from 'react';
import axios from '../../../../utils/axiosConfig';

const UPDATE_INTERVAL = 5000; // 5초

const getStatus = (cpu, memory, rps) => {
    if (cpu > 90 || memory > 90) {
        return { level: 'Critical', color: '#e53e3e', icon: '🔥' };
    }
    if (cpu > 75 || memory > 75 || rps > 50) { // RPS 임계값은 예시입니다.
        return { level: 'Warning', color: '#ed8936', icon: '⚠️' };
    }
    return { level: 'Good', color: '#38A169', icon: '✅' };
};

const OverallStatus = () => {
    const [status, setStatus] = useState({ level: 'Good', color: '#38A169', icon: '✅' });
    const lastRequestCount = useRef(0);
    const lastRequestTime = useRef(Date.now());

    const fetchData = async () => {
        try {
            // Fetch CPU
            const cpuRes = await axios.get('/actuator/metrics/system.cpu.usage');
            const cpuUsage = Math.ceil((cpuRes.data.measurements[0]?.value ?? 0) * 100);

            // Fetch Memory
            const memUsedRes = await axios.get('/actuator/metrics/jvm.memory.used');
            const memMaxRes = await axios.get('/actuator/metrics/jvm.memory.max');
            const usedMemory = memUsedRes.data.measurements[0]?.value ?? 0;
            const maxMemory = memMaxRes.data.measurements[0]?.value ?? 1;
            const memoryUsage = Math.ceil((usedMemory / maxMemory) * 100);

            // Fetch RPS
            const rpsRes = await axios.get('/actuator/metrics/http.server.requests');
            const currentRequestCount = rpsRes.data.measurements.find(m => m.statistic === 'COUNT')?.value ?? 0;
            const currentTime = Date.now();
            const countDelta = currentRequestCount - lastRequestCount.current;
            const timeDeltaInSeconds = (currentTime - lastRequestTime.current) / 1000;
            const rps = timeDeltaInSeconds > 0 ? (countDelta / timeDeltaInSeconds) : 0;

            lastRequestCount.current = currentRequestCount;
            lastRequestTime.current = currentTime;

            setStatus(getStatus(cpuUsage, memoryUsage, rps));

        } catch (error) {
            console.error('전체 상태 데이터 가져오기 실패:', error);
            setStatus({ level: 'Unknown', color: '#A0AEC0', icon: '❓' });
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, UPDATE_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ textAlign: 'center' }}>
            <h3>📊 서버 전체 상태</h3>
            <div style={{ color: status.color, fontSize: '2.5rem', fontWeight: 'bold', margin: '1rem 0' }}>
                <span style={{ marginRight: '1rem' }}>{status.icon}</span>
                {status.level}
            </div>
            <p style={{ color: '#718096', fontSize: '0.9rem' }}>서버의 현재 부하 상태를 나타냅니다.</p>
        </div>
    );
};

export default OverallStatus;
