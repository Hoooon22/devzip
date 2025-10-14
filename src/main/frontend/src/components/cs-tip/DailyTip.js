import React from 'react';
import PropTypes from 'prop-types';
import './DailyTip.scss'; 

const DailyTip = ({ tip }) => {
    return (
        <div className="daily-tip-container">
            <span className="daily-tip-icon">💡</span>
            <p className="daily-tip-text">{tip}</p>
        </div>
    );
};

DailyTip.propTypes = {
    tip: PropTypes.string.isRequired,
};

export default DailyTip;
