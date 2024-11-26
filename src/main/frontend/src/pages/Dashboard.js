import React from "react";
import "../assets/css/Dashboard.scss";
import Sidebar from "../components/dashboard/main/Sidebar";
import View from "../components/dashboard/main/View";

const Dashboard = () => {

    return (
        <div className="dashboard-container">
            <Sidebar />
            <View />
        </div>
    );
};

export default Dashboard;