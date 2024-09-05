// src/components/RandomJoke.js
import React from 'react';

function RandomJoke({ joke }) {
    return (
        <div className="joke-container">
            <h3>{joke.setup}</h3>
            <p>{joke.punchline}</p>
        </div>
    );
}

export default RandomJoke;
