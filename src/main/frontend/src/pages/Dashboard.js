import React from "react";
import "../assets/css/Dashboard.scss";
import Sidebar from "../components/dashboard/main/Sidebar";

const Dashboard = () => {

    return (
        <div className="dashboard-container">
            <Sidebar />
        </div>
    );
};

export default Dashboard;