// DungeonGenerator.js
import { initializeDungeon, createOuterWalls, createRooms, createDoors } from '../components/objects/Structures.js';
import { placePlayer } from '../components/objects/Player.js';
import { placeEnemies } from '../components/objects/Enemy.js';
import { placeBoss } from '../components/objects/Boss.js';

export const generateDungeon = (setMessages) => {
  const dungeon = initializeDungeon();
  createOuterWalls(dungeon);
  const rooms = createRooms(dungeon);
  createDoors(dungeon, rooms);
  placePlayer(dungeon);  // 던전에 플레이어 배치
  placeEnemies(dungeon);
  placeBoss(dungeon);

  // 맵 생성 시 메시지를 추가 ($$$$$$$$$ 메시지 생성 작업 시작 해야 함!!!!!!!!)
  setMessages((prevMessages) => [...prevMessages, '새로운 던전을 생성했습니다.']);

  return dungeon;
};
