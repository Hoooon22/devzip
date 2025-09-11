import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import authService from '../services/AuthService';
import '../assets/css/LiveChatRoomPage.scss';

function LiveChatRoomPage() {
    const { roomId } = useParams();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const stompClient = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        setCurrentUser(authService.getCurrentUsername());
    }, []);

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

        const token = authService.getToken();

        const socket = new SockJS('/ws-livechat');
        stompClient.current = new Client({
            webSocketFactory: () => socket,
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
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
        <div className="live-chat-room">
            <h2>Chat Room #{roomId}</h2>
            <div className="message-list">
                {messages.map((msg, index) => (
                    <div 
                        key={index} 
                        className={`message-bubble ${msg.senderName === currentUser ? 'my-message' : 'other-message'}`}
                    >
                        <div className="sender">{msg.senderName}</div>
                        <div className="text">{msg.message}</div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
                <input
                    type="text"
                    placeholder="Enter message"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
}

export default LiveChatRoomPage;
