import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import musicBoxWebSocketService from '../../services/musicBoxWebSocket';
import { fetchGridState } from '../../services/musicBoxApi';

// 그리드 크기 상수
const GRID_WIDTH = 16;
const GRID_HEIGHT = 8;

// 음계 레이블 (C4부터 C5까지)
const NOTE_LABELS = ['C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'];

/**
 * 뮤직 그리드 컴포넌트
 *
 * 사용자들이 실시간으로 노트를 추가/제거할 수 있는 그리드입니다.
 */
const MusicGrid = ({ onGridChange, currentPlaybackPosition = -1, username }) => {
    // 그리드 상태: 2차원 배열 [y][x]
    const [grid, setGrid] = useState(
        Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(false))
    );

    const [connected, setConnected] = useState(false);

    /**
     * 초기 그리드 상태 로드
     */
    const loadInitialGrid = useCallback(async () => {
        try {
            const data = await fetchGridState();
            console.log('📋 Initial grid state loaded:', data);
            console.log('📋 Active cells count:', data.activeCells.length);

            // 새로운 그리드 생성
            const newGrid = Array(GRID_HEIGHT).fill(null)
                .map(() => Array(GRID_WIDTH).fill(false));

            // 활성화된 셀들 적용
            data.activeCells.forEach(cell => {
                if (cell.active && cell.y < GRID_HEIGHT && cell.x < GRID_WIDTH) {
                    newGrid[cell.y][cell.x] = true;
                    console.log(`✅ Restored cell at (${cell.x}, ${cell.y})`);
                }
            });

            setGrid(newGrid);

            // 부모 컴포넌트에 그리드 상태 전달 (항상 호출)
            onGridChange(newGrid);
            console.log('📤 Grid state sent to parent component');
        } catch (error) {
            console.error('❌ Failed to load initial grid state:', error);
        }
    }, [onGridChange]);

    /**
     * WebSocket 메시지 수신 핸들러
     */
    const handleMessageReceived = useCallback((message) => {
        console.log('📨 WebSocket message received:', message);

        if (message.type === 'CLEAR') {
            // 전체 클리어
            const clearedGrid = Array(GRID_HEIGHT).fill(null)
                .map(() => Array(GRID_WIDTH).fill(false));
            setGrid(clearedGrid);

            // 부모 컴포넌트에 그리드 상태 전달
            if (onGridChange) {
                onGridChange(clearedGrid);
            }
            return;
        }

        if (message.type === 'TOGGLE') {
            // 특정 셀 토글
            setGrid(prevGrid => {
                const newGrid = prevGrid.map(row => [...row]);
                newGrid[message.y][message.x] = message.active;

                // 부모 컴포넌트에 그리드 상태 전달
                if (onGridChange) {
                    onGridChange(newGrid);
                }

                return newGrid;
            });
        }
    }, [onGridChange]);

    /**
     * 컴포넌트 마운트 시 WebSocket 연결 및 초기 데이터 로드
     */
    useEffect(() => {
        // 초기 그리드 상태 로드
        loadInitialGrid();

        // WebSocket 연결 (사용자명과 함께)
        musicBoxWebSocketService.connect(
            handleMessageReceived,
            () => {
                console.log('✅ WebSocket connected');
                console.log('👤 Username:', username);
                setConnected(true);
            },
            (error) => {
                console.error('❌ WebSocket error:', error);
                setConnected(false);
            },
            username // 사용자명 전달
        );

        // 컴포넌트 언마운트 시 연결 종료
        return () => {
            musicBoxWebSocketService.disconnect();
        };
    }, [loadInitialGrid, handleMessageReceived, username]);

    /**
     * 셀 클릭 핸들러
     */
    const handleCellClick = (x, y) => {
        console.log(`🖱️ Cell clicked: (${x}, ${y})`);

        // WebSocket으로 토글 메시지 전송
        musicBoxWebSocketService.sendToggleMessage(x, y, username);
    };

    return (
        <Container>
            <Header>
                <Title>🎵 카오틱 뮤직박스</Title>
                <Status connected={connected}>
                    {connected ? '🟢 연결됨' : '🔴 연결 끊김'}
                </Status>
            </Header>

            <Description>
                셀을 클릭하여 노트를 추가/제거하세요. 변경사항이 모든 사용자에게 실시간으로 동기화되며, 재생 중인 음악에도 즉시 반영됩니다!
            </Description>

            <GridContainer>
                {/* Y축 레이블 */}
                <YLabelsContainer>
                    {NOTE_LABELS.map((label, index) => (
                        <YLabel key={index}>{label}</YLabel>
                    ))}
                </YLabelsContainer>

                {/* 그리드 */}
                <GridWrapper>
                    {grid.map((row, y) => (
                        <GridRow key={y}>
                            {row.map((active, x) => (
                                <GridCell
                                    key={`${x}-${y}`}
                                    active={active}
                                    beat={x % 4 === 0} // 4비트마다 강조
                                    isPlaying={x === currentPlaybackPosition} // 재생 중인 열 하이라이트
                                    onClick={() => handleCellClick(x, y)}
                                >
                                    {active && '●'}
                                </GridCell>
                            ))}
                        </GridRow>
                    ))}

                    {/* X축 레이블 */}
                    <XLabelsContainer>
                        {Array(GRID_WIDTH).fill(0).map((_, i) => (
                            <XLabel key={i} beat={i % 4 === 0}>
                                {i}
                            </XLabel>
                        ))}
                    </XLabelsContainer>
                </GridWrapper>
            </GridContainer>

            <Controls>
                <UserInfo>현재 사용자: {username}</UserInfo>
            </Controls>
        </Container>
    );
};

MusicGrid.propTypes = {
    onGridChange: PropTypes.func,
    currentPlaybackPosition: PropTypes.number,
    username: PropTypes.string
};

export default MusicGrid;

// Styled Components
const Container = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Arial', sans-serif;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
`;

const Title = styled.h1`
    font-size: 2rem;
    color: #333;
`;

const Status = styled.div`
    font-size: 1rem;
    color: ${props => props.connected ? '#4CAF50' : '#f44336'};
    font-weight: bold;
`;

const Description = styled.p`
    font-size: 1rem;
    color: #666;
    margin-bottom: 20px;
`;

const GridContainer = styled.div`
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
`;

const YLabelsContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    padding: 10px 0;
`;

const YLabel = styled.div`
    font-size: 0.9rem;
    font-weight: bold;
    color: #555;
    text-align: right;
    padding-right: 10px;
    height: 40px;
    display: flex;
    align-items: center;
`;

const GridWrapper = styled.div`
    flex: 1;
`;

const GridRow = styled.div`
    display: flex;
`;

const GridCell = styled.div`
    width: 40px;
    height: 40px;
    border: 1px solid ${props => props.beat ? '#333' : '#ddd'};
    background-color: ${props => {
        if (props.isPlaying) {
            return props.active ? '#FFD700' : '#FFF8DC'; // 재생 중: 활성화=금색, 비활성화=연한 베이지
        }
        return props.active ? '#4CAF50' : '#fff';
    }};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: ${props => props.isPlaying && props.active ? '#333' : 'white'};
    transition: all 0.1s ease;
    box-shadow: ${props => props.isPlaying ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none'};
    transform: ${props => props.isPlaying ? 'scale(1.1)' : 'scale(1)'};

    &:hover {
        background-color: ${props => {
            if (props.isPlaying) {
                return props.active ? '#FFC700' : '#FFF0C0';
            }
            return props.active ? '#45a049' : '#f0f0f0';
        }};
        transform: scale(1.15);
    }
`;

const XLabelsContainer = styled.div`
    display: flex;
    margin-top: 5px;
`;

const XLabel = styled.div`
    width: 40px;
    text-align: center;
    font-size: 0.8rem;
    font-weight: ${props => props.beat ? 'bold' : 'normal'};
    color: ${props => props.beat ? '#333' : '#999'};
`;

const Controls = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
`;

const UserInfo = styled.div`
    font-size: 0.9rem;
    color: #666;
`;
