import React from "react";
import styles from "../../../assets/css/Sidebar.module.scss";
import logoImage from '../../../assets/imgs/devzip_logo.png';

const Sidebar = () => {
    return (
        <div className={styles.container}>
            <div className={styles.logo}>
                <img alt="DevZip" src={logoImage} />
            </div>
        </div>
    );
};

export default Sidebar;