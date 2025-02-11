import React from 'react';

const ApiPage = () => {

    return (
        <div className="apiPage-container">
            <h1>API Zip</h1>

            <h2>Developer</h2>
            <a href="/api/developer/emotion">/api/developer/emotion</a>

            <h2>TrendChat</h2>
            <a href="/api/trend/timestamp">/api/trend/timestamp</a>
            <a href="/api/trend/keywords">/api/trend/keywords</a>
        </div>
    );
};

export default ApiPage;