import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import musicBoxWebSocketService from '../../services/musicBoxWebSocket';

/**
 * 활성 사용자 목록 컴포넌트
 *
 * 현재 접속 중인 사용자들을 실시간으로 표시합니다.
 */
const ActiveUsers = ({ currentUsername }) => {
    const [users, setUsers] = useState([]);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        let userListSubscription = null;

        // WebSocket 연결이 완료될 때까지 대기
        const subscribeWhenConnected = () => {
            if (!musicBoxWebSocketService.isConnected()) {
                console.log('⏳ Waiting for WebSocket connection...');
                setTimeout(subscribeWhenConnected, 100);
                return;
            }

            // /topic/musicbox/users 구독 (username 헤더와 함께)
            userListSubscription = musicBoxWebSocketService.subscribe(
                '/topic/musicbox/users',
                (message) => {
                    console.log('👥 User list updated:', message);
                    setUsers(message.users || []);
                    setTotalCount(message.totalCount || 0);
                },
                currentUsername // username 헤더 전달
            );
        };

        subscribeWhenConnected();

        // 컴포넌트 언마운트 시 구독 해제
        return () => {
            if (userListSubscription) {
                userListSubscription.unsubscribe();
            }
        };
    }, [currentUsername]);

    return (
        <Container>
            <Header>
                <Title>👥 접속 중인 사용자</Title>
                <Badge>{totalCount}명</Badge>
            </Header>

            <UserList>
                {users.length === 0 ? (
                    <EmptyState>접속 중인 사용자가 없습니다</EmptyState>
                ) : (
                    users.map((username, index) => (
                        <UserItem
                            key={`${username}-${index}`}
                            isCurrentUser={username === currentUsername}
                        >
                            <UserIcon>
                                {username === currentUsername ? '👤' : '👥'}
                            </UserIcon>
                            <Username>
                                {username}
                                {username === currentUsername && ' (나)'}
                            </Username>
                            <StatusDot />
                        </UserItem>
                    ))
                )}
            </UserList>

            <Footer>
                실시간으로 업데이트됩니다
            </Footer>
        </Container>
    );
};

ActiveUsers.propTypes = {
    currentUsername: PropTypes.string.isRequired
};

export default ActiveUsers;

// Styled Components
const Container = styled.div`
    background: white;
    border-radius: 15px;
    padding: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    height: fit-content;
    position: sticky;
    top: 20px;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #f0f0f0;
`;

const Title = styled.h3`
    font-size: 1.2rem;
    font-weight: bold;
    color: #333;
    margin: 0;
`;

const Badge = styled.span`
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: bold;
`;

const UserList = styled.div`
    max-height: 400px;
    overflow-y: auto;

    /* 스크롤바 스타일링 */
    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
    }

    &::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 10px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;

const UserItem = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    margin-bottom: 8px;
    background: ${props => props.isCurrentUser ? 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' : '#f9f9f9'};
    border-radius: 10px;
    border-left: 3px solid ${props => props.isCurrentUser ? '#667eea' : 'transparent'};
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.isCurrentUser ? 'linear-gradient(135deg, #667eea25 0%, #764ba225 100%)' : '#f0f0f0'};
        transform: translateX(5px);
    }
`;

const UserIcon = styled.span`
    font-size: 1.5rem;
`;

const Username = styled.span`
    flex: 1;
    font-size: 0.95rem;
    color: #333;
    font-weight: 500;
`;

const StatusDot = styled.div`
    width: 10px;
    height: 10px;
    background: #4CAF50;
    border-radius: 50%;
    box-shadow: 0 0 10px #4CAF50;
    animation: pulse 2s infinite;

    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 40px 20px;
    color: #999;
    font-size: 0.9rem;
`;

const Footer = styled.div`
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #f0f0f0;
    text-align: center;
    font-size: 0.85rem;
    color: #999;
`;
