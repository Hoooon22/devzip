import React from "react";
import { Outlet } from "react-router-dom";
import styles from "../../../assets/css/View.module.scss";

const View = () => {
    return (
        <div className={styles.container}>
            <Outlet />
        </div>
    );
};

export default View;