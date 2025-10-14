import React from 'react';
import './DailyTip.scss'; 

const DailyTip = ({ tip }) => {
    return (
        <div className="daily-tip-container">
            <span className="daily-tip-icon">💡</span>
            <p className="daily-tip-text">{tip}</p>
        </div>
    );
};

export default DailyTip;
