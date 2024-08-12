import React, { useState, useEffect } from 'react';
import SockJS from 'sockjs-client';
// stompjs 대신 @stomp/stompjs
import { Client } from '@stomp/stompjs';

const WebSocketClient = () => {
    const [stompClient, setStompClient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const socket = new SockJS('https://localhost:8080/game-websocket');
        const client = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                client.subscribe('/topic/game', (msg) => {
                    const newMessage = JSON.parse(msg.body);
                    setMessages((prevMessages) => [...prevMessages, newMessage]);
                });
            },
        });

        client.activate();
        setStompClient(client);

        return () => {
            if (stompClient) {
                stompClient.deactivate();
            }
        };
    }, []);

    const sendMessage = () => {
        if (stompClient && stompClient.connected) {
            stompClient.publish({ destination: '/app/message', body: JSON.stringify({ content: message }) });
            setMessage('');
        }
    };

    return (
        <div>
            {/* <h1>RPG Game Chat</h1> */}
            <div>
                {messages.map((msg, index) => (
                    <div key={index}>{msg.content}</div>
                ))}
            </div>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
};

export default WebSocketClient;
