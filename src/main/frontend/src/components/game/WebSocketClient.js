import React, { useState, useEffect } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

const WebSocketClient = () => {
    const [stompClient, setStompClient] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState([]);

    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/game-websocket');
        const client = Stomp.over(socket);

        client.connect({}, () => {
            client.subscribe('/topic/game', (msg) => {
                const newMessage = JSON.parse(msg.body);
                setMessages((prevMessages) => [...prevMessages, newMessage]);
            });
        });

        setStompClient(client);

        return () => {
            if (stompClient) {
                stompClient.disconnect();
            }
        };
    }, []);

    const sendMessage = () => {
        if (stompClient && stompClient.connected) {
            stompClient.send('/app/message', {}, JSON.stringify({ contect: message }));
            setMessage('');
        }
    }

    return (
        <div>
            <h1>Game Chat</h1>
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
}