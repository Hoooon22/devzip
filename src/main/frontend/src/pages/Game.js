import React from 'react';
import WebSocketClient from '../components/game/WebSocketClient';

const GamePage = () => {
    return (
        <div>
            <h1>Game Page</h1>
            <WebSocketClient />
        </div>
    );
};

export default GamePage;
