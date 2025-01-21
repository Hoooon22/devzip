import React, { useEffect, useState } from 'react';
import { useGameStore } from '../components/store/gameStore';
import { movePlayer } from '../components/objects/Player';
import '../assets/css/Gamepage.css';

const GamePage = ({ setMessages }) => {
  const dungeon = useGameStore((state) => state.dungeon);
  const regenerateDungeon = useGameStore((state) => state.regenerateDungeon);
  const [playerPosition, setPlayerPosition] = useState(null);

  // 던전이 존재하지 않거나 초기화된 상태에서만 던전을 다시 생성
  useEffect(() => {
    if (!dungeon || dungeon.length === 0) {
      regenerateDungeon();
    } else if (playerPosition === null) {
      // 던전에서 'P'의 위치를 찾아 초기 위치로 설정
      for (let rowIndex = 0; rowIndex < dungeon.length; rowIndex++) {
        for (let cellIndex = 0; cellIndex < dungeon[rowIndex].length; cellIndex++) {
          if (dungeon[rowIndex][cellIndex] === 'P') {
            setPlayerPosition({ row: rowIndex, col: cellIndex });
            return;
          }
        }
      }
    }
  }, [dungeon, regenerateDungeon, playerPosition]);

  // Player 이동
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log(`Key pressed: ${e.key}`); // 방향키 로그 출력
      if (playerPosition) {
        const newPosition = movePlayer(dungeon, playerPosition, e.key);
        setPlayerPosition(newPosition);

        // 플레이어 이동 시 메시지를 추가
        setMessages((prevMessages) => [...prevMessages, '플레이어가 이동했습니다.']);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPosition, dungeon, setMessages]);

  return (
    <div className='game-container'>
      <button onClick={regenerateDungeon}>Generate New Dungeon</button>
      <div style={{ display: 'grid', gap: '2px', gridTemplateColumns: `repeat(${dungeon[0].length}, 20px)` }}>
        {dungeon.flatMap((row, rowIndex) =>
          row.map((cell, cellIndex) => (
            <div
              key={`${rowIndex}-${cellIndex}`}
              style={{
                width: '20px',
                height: '20px',
                textAlign: 'center',
                backgroundColor: getColor(cell),
                border: '1px solid black',
              }}
            >
              {cell}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Cell 타입에 따른 색상
const getColor = (cell) => {
    switch (cell) {
      case 'V':
        return 'black'; // Void
      case 'W':
        return 'gray'; // Wall
      case 'F':
        return 'white'; // Floor
      case 'E':
        return 'orange'; // Enemy
      case 'P':
        return 'blue'; // Player
      case 'B':
        return 'red'; // Boss
      case 'D':
        return 'green'; // Door
      default:
        return 'white';
    }
};

export default GamePage;
