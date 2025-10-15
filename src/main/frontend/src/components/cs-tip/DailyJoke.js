import React from 'react';
import PropTypes from 'prop-types';
import './DailyJoke.scss';

const DailyJoke = ({ joke, isLoading }) => {
    return (
        <div className="daily-joke-container">
            {isLoading ? (
                <>
                    <div className="loading-spinner"></div>
                    <p className="daily-joke-text loading">오늘의 농담을 불러오는 중...</p>
                </>
            ) : joke ? (
                <>
                    <span className="daily-joke-icon">😄</span>
                    <div className="joke-content">
                        <p className="joke-setup">{joke.translatedSetup}</p>
                        <p className="joke-punchline">{joke.translatedPunchline}</p>
                        {joke.originalSetup && (
                            <details className="joke-original">
                                <summary>원문 보기</summary>
                                <div className="original-content">
                                    <p className="original-text">
                                        <strong>Q:</strong> {joke.originalSetup}
                                    </p>
                                    <p className="original-text">
                                        <strong>A:</strong> {joke.originalPunchline}
                                    </p>
                                </div>
                            </details>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <span className="daily-joke-icon">😅</span>
                    <p className="daily-joke-text">농담을 불러오지 못했습니다.</p>
                </>
            )}
        </div>
    );
};

DailyJoke.propTypes = {
    joke: PropTypes.shape({
        originalSetup: PropTypes.string,
        originalPunchline: PropTypes.string,
        translatedSetup: PropTypes.string,
        translatedPunchline: PropTypes.string,
        type: PropTypes.string,
    }),
    isLoading: PropTypes.bool,
};

DailyJoke.defaultProps = {
    joke: null,
    isLoading: false,
};

export default DailyJoke;