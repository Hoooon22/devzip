import React from 'react';
import PropTypes from 'prop-types';
import './DailyTip.scss';

const DailyTip = ({ tip, isLoading }) => {
    return (
        <div className="daily-tip-container">
            {isLoading ? (
                <>
                    <div className="loading-spinner"></div>
                    <p className="daily-tip-text loading">오늘의 CS 팁을 불러오는 중...</p>
                </>
            ) : (
                <>
                    <span className="daily-tip-icon">💡</span>
                    <p className="daily-tip-text">{tip || '오늘의 팁이 없습니다.'}</p>
                </>
            )}
        </div>
    );
};

DailyTip.propTypes = {
    tip: PropTypes.string,
    isLoading: PropTypes.bool,
};

DailyTip.defaultProps = {
    tip: '',
    isLoading: false,
};

export default DailyTip;
