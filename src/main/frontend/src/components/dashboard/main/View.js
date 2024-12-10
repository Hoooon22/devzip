import React from "react";
import styles from "../../../assets/css/View.module.scss";
import { ViewTop, CPUUsage, MemoryUsage, NetworkTraffic } from "./viewContainer";

const View = () => {
    
    return (
        <div className={styles.container}>
            <ViewTop />
            <CPUUsage />
            <MemoryUsage />
            <NetworkTraffic />
        </div>
    );
};

export default View;