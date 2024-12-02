import React from "react";
import styles from "../../../assets/css/View.module.scss";
import { ViewTop } from "./viewContainer";

const View = () => {
    
    return (
        <div className={styles.container}>
            <ViewTop />
        </div>
    );
};

export default View;