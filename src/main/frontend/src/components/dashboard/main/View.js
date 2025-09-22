import React from "react";
import styles from "../../../assets/css/View.module.scss";
import { ViewTop, CPUUsage, MemoryUsage, RequestsPerSecond, OverallStatus } from "./viewContainer";

const View = () => {
    
    return (
        <div className={styles.container}>
            <div className={styles.viewTop}><ViewTop /></div>
            <div className={styles.widget}><OverallStatus /></div>
            <div className={styles.widget}><CPUUsage /></div>
            <div className={styles.widget}><MemoryUsage /></div>
            <div className={styles.widget}><RequestsPerSecond /></div>
        </div>
    );
};

export default View;