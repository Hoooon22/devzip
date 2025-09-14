import React, { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/AuthService';
import '../assets/css/LiveChatListPage.scss';

function LiveChatListPage() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/livechat/rooms');
            setRooms(response.data);
        } catch (error) {
            console.error('Error fetching chat rooms:', error);
            if (error.response?.status === 401) {
                alert('인증이 필요합니다. 로그인해주세요.');
            }
        } finally {
            setLoading(false);
        }
    };

    const createRoom = async () => {
        // 로그인 확인
        if (!authService.getToken()) {
            alert('채팅방을 생성하려면 로그인이 필요합니다.');
            return;
        }

        const roomName = prompt('새 채팅방 이름을 입력하세요:');
        if (roomName && roomName.trim()) {
            try {
                setCreating(true);
                const response = await axios.post('/api/livechat/rooms', {
                    name: roomName.trim()
                });
                navigate(`/livechat/${response.data.id}`);
            } catch (error) {
                console.error('Error creating chat room:', error);
                if (error.response?.status === 401) {
                    alert('인증이 필요합니다. 로그인해주세요.');
                } else {
                    alert('채팅방 생성에 실패했습니다. 다시 시도해주세요.');
                }
            } finally {
                setCreating(false);
            }
        }
    };

    const getCreatorInitial = (creatorName) => {
        return creatorName ? creatorName.charAt(0).toUpperCase() : '?';
    };

    const handleRoomClick = (roomId) => {
        if (!authService.getToken()) {
            alert('채팅방에 참여하려면 로그인이 필요합니다.');
            return;
        }
        navigate(`/livechat/${roomId}`);
    };

    return (
        <div className="live-chat-list">
            <div className="container">
                <div className="header">
                    <h1>💬 Live Chat</h1>
                    <p className="subtitle">실시간으로 소통할 수 있는 채팅방에 참여해보세요</p>
                    <button
                        className="create-room-btn"
                        onClick={createRoom}
                        disabled={creating}
                    >
                        {creating ? (
                            <>
                                <div className="loading-spinner"></div>
                                생성 중...
                            </>
                        ) : (
                            <>
                                <span className="icon">+</span>
                                새 채팅방 만들기
                            </>
                        )}
                    </button>
                </div>

                {loading ? (
                    <div className="empty-state">
                        <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
                        <div className="empty-title">채팅방을 불러오는 중...</div>
                    </div>
                ) : rooms.length > 0 ? (
                    <div className="rooms-grid">
                        {rooms.map((room, index) => (
                            <div
                                key={room.id}
                                className="room-card"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="room-header">
                                    <h3 className="room-name">{room.name}</h3>
                                    <span className="room-id">#{room.id}</span>
                                </div>

                                <div className="room-info">
                                    <div className="creator-info">
                                        <div className="creator-avatar">
                                            {getCreatorInitial(room.creatorName)}
                                        </div>
                                        <span>by {room.creatorName || 'Unknown'}</span>
                                    </div>
                                </div>

                                <button
                                    className="join-btn"
                                    onClick={() => handleRoomClick(room.id)}
                                >
                                    채팅방 입장
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">🏠</div>
                        <div className="empty-title">아직 채팅방이 없습니다</div>
                        <div className="empty-subtitle">첫 번째 채팅방을 만들어보세요!</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LiveChatListPage;
