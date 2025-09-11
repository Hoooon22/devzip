import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

function LiveChatRoomPage() {
    const { roomId } = useParams();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const stompClient = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchPreviousMessages = async () => {
            try {
                const response = await axios.get(`/api/livechat/rooms/${roomId}/messages`);
                setMessages(response.data);
            } catch (error) {
                console.error('Error fetching previous messages:', error);
            }
        };

        fetchPreviousMessages();

        const socket = new SockJS('/ws-livechat');
        stompClient.current = new Client({
            webSocketFactory: () => socket,
            onConnect: () => {
                console.log('Connected to WebSocket');
                stompClient.current.subscribe(`/topic/room/${roomId}`, (message) => {
                    const receivedMessage = JSON.parse(message.body);
                    setMessages(prevMessages => [...prevMessages, receivedMessage]);
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
        });

        stompClient.current.activate();

        return () => {
            if (stompClient.current) {
                stompClient.current.deactivate();
            }
        };
    }, [roomId]);

    const sendMessage = () => {
        if (newMessage.trim() && stompClient.current) {
            const chatMessage = {
                roomId: roomId,
                senderName: 'testuser', // Should be from auth context
                message: newMessage,
            };
            stompClient.current.publish({
                destination: '/app/livechat/message',
                body: JSON.stringify(chatMessage),
            });
            setNewMessage('');
        }
    };

    return (
        <div>
            <h2>Chat Room #{roomId}</h2>
            <div style={{ border: '1px solid #ccc', height: '400px', overflowY: 'scroll', padding: '10px', marginBottom: '10px' }}>
                {messages.map((msg, index) => (
                    <div key={index}>
                        <strong>{msg.senderName}:</strong> {msg.message}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <input
                type="text"
                placeholder="Enter message"
                style={{ width: '80%' }}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
}

export default LiveChatRoomPage;
