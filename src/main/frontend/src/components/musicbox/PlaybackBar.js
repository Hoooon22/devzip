import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import audioEngine from '../../utils/audioEngine';

/**
 * 재생 바 컴포넌트
 *
 * 이 컴포넌트는 WebSocket과 완전히 독립적으로 작동하며,
 * requestAnimationFrame을 사용해 재생 바를 부드럽게 움직이고
 * 각 셀을 지날 때마다 사운드를 재생합니다.
 */
const PlaybackBar = ({ grid, gridWidth = 16 }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(0);
    const [bpm, setBpm] = useState(120); // 기본 120 BPM

    const animationFrameRef = useRef(null);
    const lastTimeRef = useRef(0);
    const positionRef = useRef(0);

    // BPM에 따른 한 칸당 이동 시간 계산 (밀리초)
    const timePerStep = (60 / bpm) * 1000 / 4; // 16분음표 기준

    /**
     * 특정 X 좌표의 활성화된 노트 재생
     */
    const playNotesAtPosition = useCallback((x) => {
        if (!audioEngine.isInitialized()) {
            return;
        }

        const activeNotes = [];

        // 해당 X 좌표의 모든 Y를 검사
        for (let y = 0; y < grid.length; y++) {
            if (grid[y][x]) {
                activeNotes.push(y);
            }
        }

        // 활성화된 노트가 있으면 재생
        if (activeNotes.length > 0) {
            audioEngine.playChord(activeNotes, 0.15);
            console.log(`🎵 Playing notes at x=${x}:`, activeNotes);
        }
    }, [grid]);

    /**
     * 재생 루프
     */
    const animate = useCallback((timestamp) => {
        if (!lastTimeRef.current) {
            lastTimeRef.current = timestamp;
        }

        const deltaTime = timestamp - lastTimeRef.current;

        // 충분한 시간이 경과했으면 다음 칸으로 이동
        if (deltaTime >= timePerStep) {
            const newPosition = (positionRef.current + 1) % gridWidth;
            positionRef.current = newPosition;

            // 상태 업데이트 (UI 렌더링용)
            setCurrentPosition(newPosition);

            // 해당 위치의 노트 재생
            playNotesAtPosition(newPosition);

            lastTimeRef.current = timestamp;
        }

        // 다음 프레임 예약
        animationFrameRef.current = requestAnimationFrame(animate);
    }, [timePerStep, gridWidth, playNotesAtPosition]);

    /**
     * 재생/정지 토글
     */
    const togglePlayback = async () => {
        if (!isPlaying) {
            // 재생 시작

            // AudioEngine 초기화 (첫 재생 시에만)
            if (!audioEngine.isInitialized()) {
                await audioEngine.initialize();
            }

            setIsPlaying(true);
            lastTimeRef.current = 0;
            animationFrameRef.current = requestAnimationFrame(animate);

            console.log('▶️ 재생 시작');
        } else {
            // 재생 정지
            setIsPlaying(false);

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            console.log('⏸️ 재생 일시정지');
        }
    };

    /**
     * BPM 변경 핸들러
     */
    const handleBpmChange = (e) => {
        const newBpm = parseInt(e.target.value, 10);
        setBpm(newBpm);
        console.log(`🎼 BPM changed to: ${newBpm}`);
    };

    /**
     * 컴포넌트 언마운트 시 애니메이션 정리
     */
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <Container>
            <Controls>
                <PlayButton onClick={togglePlayback}>
                    {isPlaying ? '⏸️ 일시정지' : '▶️ 재생'}
                </PlayButton>

                <BpmControl>
                    <BpmLabel>BPM:</BpmLabel>
                    <BpmInput
                        type="number"
                        min="60"
                        max="240"
                        value={bpm}
                        onChange={handleBpmChange}
                        disabled={isPlaying}
                    />
                </BpmControl>

                <PositionIndicator>
                    위치: {currentPosition} / {gridWidth - 1}
                </PositionIndicator>
            </Controls>

            <ProgressBarContainer>
                <ProgressBar
                    style={{
                        width: `${((currentPosition + 1) / gridWidth) * 100}%`
                    }}
                />
            </ProgressBarContainer>
        </Container>
    );
};

PlaybackBar.propTypes = {
    grid: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.bool)).isRequired,
    gridWidth: PropTypes.number
};

export default PlaybackBar;

// Styled Components
const Container = styled.div`
    margin: 20px 0;
    padding: 20px;
    background-color: #f5f5f5;
    border-radius: 10px;
`;

const Controls = styled.div`
    display: flex;
    gap: 20px;
    align-items: center;
    margin-bottom: 15px;
`;

const PlayButton = styled.button`
    padding: 12px 30px;
    font-size: 1.1rem;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.3s, transform 0.1s;

    &:hover {
        background-color: #45a049;
        transform: scale(1.05);
    }

    &:active {
        transform: scale(0.98);
    }
`;

const BpmControl = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const BpmLabel = styled.span`
    font-size: 1rem;
    font-weight: bold;
    color: #333;
`;

const BpmInput = styled.input`
    width: 80px;
    padding: 8px;
    font-size: 1rem;
    border: 2px solid #ddd;
    border-radius: 5px;
    text-align: center;

    &:disabled {
        background-color: #e0e0e0;
        cursor: not-allowed;
    }
`;

const PositionIndicator = styled.div`
    font-size: 0.9rem;
    color: #666;
    margin-left: auto;
`;

const ProgressBarContainer = styled.div`
    width: 100%;
    height: 10px;
    background-color: #ddd;
    border-radius: 5px;
    overflow: hidden;
`;

const ProgressBar = styled.div`
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    transition: width 0.1s linear;
`;
