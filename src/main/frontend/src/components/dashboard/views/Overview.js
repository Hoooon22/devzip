import React from 'react';
import styles from '../../../assets/css/View.module.scss';
import { OverallStatus, CPUUsage, MemoryUsage, RequestsPerSecond, SystemMetricsChart } from "../main/viewContainer";

const Overview = () => {
    return (
        <div className={styles.container}>
            <div className={styles.widget}><OverallStatus /></div>
            <div className={styles.widget}><CPUUsage /></div>
            <div className={styles.widget}><MemoryUsage /></div>
            <div className={styles.widget}><RequestsPerSecond /></div>
            <div className={styles.fullWidthWidget}><SystemMetricsChart /></div>
        </div>
    );
};

export default Overview;
