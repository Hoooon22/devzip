import React from "react";
import { NavLink } from "react-router-dom";
import styles from "../../../assets/css/Sidebar.module.scss";
import logoImage from '../../../assets/imgs/devzip_logo.png';
import { FaHome, FaServer } from 'react-icons/fa'; // react-icons에서 아이콘 import

const Sidebar = () => {
    const navItems = [
        { path: "/dashboard", exact: true, icon: <FaHome />, name: "Overview" },
        { path: "/dashboard/system", exact: false, icon: <FaServer />, name: "System" },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.logo}>
                <img alt="DevZip" src={logoImage} />
                <h2>Dashboard</h2>
            </div>
            <nav className={styles.nav}>
                <ul>
                    {navItems.map((item) => (
                        <li key={item.name}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
                                end={item.exact}
                            >
                                {item.icon}
                                <span>{item.name}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;