import React from "react";
import styles from "../../../assets/css/View.module.scss";
import { ViewTop, CPUUsage, MemoryUsage } from "./viewContainer";

const View = () => {
    
    return (
        <div className={styles.container}>
            <ViewTop />
            <CPUUsage />
            <MemoryUsage />
        </div>
    );
};

export default View;