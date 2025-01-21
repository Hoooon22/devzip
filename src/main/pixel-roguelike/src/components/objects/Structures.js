import { MAP_WIDTH, MAP_HEIGHT } from '../../utils/Constants.js';

// 맵 초기화
export const initializeDungeon = () => {
  return Array.from({ length: MAP_HEIGHT }, () =>
    Array.from({ length: MAP_WIDTH }, () => 'F') // F: Floor (바닥)
  );
};

// 맵의 가장자리는 벽(W)으로 둘러싸고, 그 외부는 Void(V)로 채운다
export const createOuterWalls = (dungeon) => {
  // 맵의 가장자리를 벽(W)으로 설정
  for (let x = 0; x < MAP_WIDTH; x++) {
    dungeon[0][x] = 'W'; // 위쪽
    dungeon[MAP_HEIGHT - 1][x] = 'W'; // 아래쪽
  }

  for (let y = 0; y < MAP_HEIGHT; y++) {
    dungeon[y][0] = 'W'; // 왼쪽
    dungeon[y][MAP_WIDTH - 1] = 'W'; // 오른쪽
  }
};

// 방 생성 (불규칙적인 형태)
export const createRooms = (dungeon, roomCount = 5) => {
  const rooms = [];
  for (let r = 0; r < roomCount; r++) {
    const roomWidth = Math.floor(Math.random() * 6) + 4;  // 방 너비 (4~9)
    const roomHeight = Math.floor(Math.random() * 6) + 4; // 방 높이 (4~9)
    const startX = Math.floor(Math.random() * (MAP_WIDTH - roomWidth - 2)) + 1;
    const startY = Math.floor(Math.random() * (MAP_HEIGHT - roomHeight - 2)) + 1;

    // 방이 다른 방과 겹치는지 확인
    let overlap = false;
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      if (
        startX < room.startX + room.roomWidth &&
        startX + roomWidth > room.startX &&
        startY < room.startY + room.roomHeight &&
        startY + roomHeight > room.startY
      ) {
        overlap = true;
        break;
      }
    }

    // 방이 겹치지 않으면 추가
    if (!overlap) {
      rooms.push({ startX, startY, roomWidth, roomHeight });

      // 방 생성
      for (let i = 0; i < roomHeight; i++) {
        for (let j = 0; j < roomWidth; j++) {
          if (i === 0 || j === 0 || i === roomHeight - 1 || j === roomWidth - 1) {
            dungeon[startY + i][startX + j] = 'W'; // W: Wall (벽)
          } else {
            dungeon[startY + i][startX + j] = 'F'; // F: Floor (바닥)
          }
        }
      }
    }
  }

  return rooms;
};

// 출입구(Door) 생성
export const createDoors = (dungeon, rooms) => {
  rooms.forEach(({ startX, startY, roomWidth, roomHeight }) => {
    const directions = [
      { x: startX + Math.floor(roomWidth / 2), y: startY }, // 위쪽 벽
      { x: startX + Math.floor(roomWidth / 2), y: startY + roomHeight - 1 }, // 아래쪽 벽
      { x: startX, y: startY + Math.floor(roomHeight / 2) }, // 왼쪽 벽
      { x: startX + roomWidth - 1, y: startY + Math.floor(roomHeight / 2) }, // 오른쪽 벽
    ];

    const availableDirections = directions.filter(({ x, y }) => dungeon[y][x] === 'W');
    if (availableDirections.length > 0) {
      const { x, y } = availableDirections[Math.floor(Math.random() * availableDirections.length)];
      dungeon[y][x] = 'D'; // D: Door (문) 생성
    }
  });
};
