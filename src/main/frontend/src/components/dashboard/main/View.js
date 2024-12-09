import React from "react";
import styles from "../../../assets/css/View.module.scss";
import { ViewTop, PCSpecs } from "./viewContainer";

const View = () => {
    
    return (
        <div className={styles.container}>
            <ViewTop />
            <PCSpecs />
        </div>
    );
};

export default View;