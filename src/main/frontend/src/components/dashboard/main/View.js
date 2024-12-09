import React from "react";
import styles from "../../../assets/css/View.module.scss";
import { ViewTop, CPUUsage } from "./viewContainer";

const View = () => {
    
    return (
        <div className={styles.container}>
            <ViewTop />
            <CPUUsage />
        </div>
    );
};

export default View;