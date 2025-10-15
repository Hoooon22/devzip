// src/components/RandomJoke.js
import React from 'react';
import PropTypes from 'prop-types';

function RandomJoke({ joke }) {
    return (
        <div className="joke-container">
            {/* 번역된 한글 농담 표시 */}
            <div className="translated-joke">
                <h3 className="joke-setup">{joke.translatedSetup || joke.setup}</h3>
                <p className="joke-punchline">{joke.translatedPunchline || joke.punchline}</p>
            </div>

            {/* 원문 영어 농담 (접기/펼치기) */}
            {joke.originalSetup && joke.originalPunchline && (
                <details className="original-joke">
                    <summary>원문 보기 (Original)</summary>
                    <div className="original-content">
                        <p className="original-setup"><strong>Q:</strong> {joke.originalSetup}</p>
                        <p className="original-punchline"><strong>A:</strong> {joke.originalPunchline}</p>
                    </div>
                </details>
            )}
        </div>
    );
}

RandomJoke.propTypes = {
    joke: PropTypes.shape({
        originalSetup: PropTypes.string,
        originalPunchline: PropTypes.string,
        translatedSetup: PropTypes.string,
        translatedPunchline: PropTypes.string,
        type: PropTypes.string,
        // 하위 호환성을 위한 기존 필드들
        setup: PropTypes.string,
        punchline: PropTypes.string
    }).isRequired
};

export default RandomJoke;
