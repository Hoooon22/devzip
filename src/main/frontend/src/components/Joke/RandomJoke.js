// src/components/RandomJoke.js
import React from 'react';
import PropTypes from 'prop-types';

function RandomJoke({ joke }) {
    return (
        <div className="joke-container">
            <h3>{joke.setup}</h3>
            <p>{joke.punchline}</p>
        </div>
    );
}

RandomJoke.propTypes = {
    joke: PropTypes.shape({
        setup: PropTypes.string.isRequired,
        punchline: PropTypes.string.isRequired
    }).isRequired
};

export default RandomJoke;
