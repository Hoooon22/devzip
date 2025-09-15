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
    const [roomName, setRoomName] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isComposing, setIsComposing] = useState(false);
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
        const fetchRoomDetails = async () => {
            try {
                const token = authService.getToken();
                const response = await axios.get('/api/livechat/rooms', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const room = response.data.find(r => r.id.toString() === roomId);
                if (room) {
                    setRoomName(room.name);
                }
            } catch (error) {
                console.error('Error fetching room details:', error);
            }
        };

        const fetchPreviousMessages = async () => {
            try {
                const token = authService.getToken();
                console.log('Fetching messages with token:', token ? 'Token exists' : 'No token');
                
                const response = await axios.get(`/api/livechat/rooms/${roomId}/messages`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                console.log('Loaded previous messages:', response.data);
                console.log('First message structure:', response.data[0]);
                setMessages(response.data);
            } catch (error) {
                console.error('Error fetching previous messages:', error);
                if (error.response?.status === 401) {
                    alert('인증이 필요합니다. 다시 로그인해주세요.');
                }
            }
        };

        fetchRoomDetails();
        fetchPreviousMessages();

        const token = authService.getToken();
        console.log('WebSocket connecting with token:', token ? 'Token exists' : 'No token');

        const socket = new SockJS('/ws-livechat');
        stompClient.current = new Client({
            webSocketFactory: () => socket,
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            onConnect: (frame) => {
                console.log('Connected to WebSocket', frame);
                setIsConnected(true);

                console.log(`Subscribing to topic: /topic/room/${roomId}`);
                const subscription = stompClient.current.subscribe(`/topic/room/${roomId}`, (message) => {
                    console.log('Received raw message:', message.body);
                    const receivedMessage = JSON.parse(message.body);
                    console.log('Parsed message object:', receivedMessage);
                    console.log('Message fields:', Object.keys(receivedMessage));
                    
                    // DTO 구조에 맞게 메시지 객체 변환
                    const formattedMessage = {
                        id: receivedMessage.id,
                        senderName: receivedMessage.senderName,
                        message: receivedMessage.message,
                        sentAt: receivedMessage.createdAt || receivedMessage.sentAt, // 두 필드 모두 처리
                        createdAt: receivedMessage.createdAt || receivedMessage.sentAt
                    };
                    
                    console.log('Formatted message:', formattedMessage);
                    setMessages(prevMessages => {
                        console.log('Current messages:', prevMessages);
                        const newMessages = [...prevMessages, formattedMessage];
                        console.log('New messages array:', newMessages);
                        return newMessages;
                    });
                });

                console.log('Subscription created:', subscription);
                console.log('Subscription id:', subscription.id);
            },
            onDisconnect: () => {
                console.log('Disconnected from WebSocket');
                setIsConnected(false);
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
                setIsConnected(false);
            },
            onWebSocketError: (error) => {
                console.error('WebSocket error:', error);
                setIsConnected(false);
            }
        });

        stompClient.current.activate();

        return () => {
            if (stompClient.current) {
                setIsConnected(false);
                stompClient.current.deactivate();
            }
        };
    }, [roomId]);

    const sendMessage = () => {
        if (!newMessage.trim()) {
            console.log('Empty message, not sending');
            return;
        }

        if (!stompClient.current) {
            console.error('STOMP client is not initialized');
            alert('WebSocket 연결이 없습니다. 페이지를 새로고침해주세요.');
            return;
        }

        if (!isConnected) {
            console.error('WebSocket is not connected');
            alert('WebSocket이 연결되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        if (!stompClient.current.connected) {
            console.error('STOMP client is not connected');
            alert('STOMP 연결이 아직 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        try {
            const chatMessage = {
                roomId: parseInt(roomId),
                senderName: currentUser,
                message: newMessage.trim(),
            };

            console.log('Sending message:', chatMessage);
            console.log('Current user when sending:', currentUser);
            
            stompClient.current.publish({
                destination: '/app/livechat/message',
                body: JSON.stringify(chatMessage),
            });
            
            setNewMessage('');
            console.log('Message sent successfully');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('메시지 전송에 실패했습니다. 다시 시도해주세요.');
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleKeyPress = (e) => {
        if (isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="live-chat-room">
            <div className="chat-header">
                <div className="header-left">
                    <button
                        className="back-button"
                        onClick={() => window.history.back()}
                    >
                        ←
                    </button>
                    <div className="room-info">
                        <h2>{roomName || `채팅방 #${roomId}`}</h2>
                        <span className="room-subtitle">실시간 채팅</span>
                    </div>
                </div>
                <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                    <span className="status-dot"></span>
                    {isConnected ? '연결됨' : '연결 안됨'}
                </div>
            </div>
            <div className="message-list">
                {messages.length === 0 ? (
                    <div className="empty-chat">
                        <div className="empty-icon">💬</div>
                        <div className="empty-title">아직 메시지가 없습니다</div>
                        <div className="empty-subtitle">첫 번째 메시지를 보내보세요!</div>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`message-bubble ${msg.senderName === currentUser ? 'my-message' : 'other-message'}`}
                        >
                            {msg.senderName !== currentUser && (
                                <div className="sender">{msg.senderName}</div>
                            )}
                            <div className="message-content">
                                <div className="text">{msg.message}</div>
                                <div className="timestamp">
                                    {formatTime(msg.sentAt || msg.createdAt)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
                <div className="input-container">
                    <input
                        type="text"
                        placeholder="메시지를 입력하세요..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={() => setIsComposing(false)}
                        disabled={!isConnected}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || !isConnected}
                        className="send-button"
                    >
                        {!isConnected ? '⏳' : '➤'}
                    </button>
                </div>
                {!isConnected && (
                    <div className="connection-warning">
                        <span>⚠️ 연결이 끊어졌습니다. 다시 연결하는 중...</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LiveChatRoomPage;
