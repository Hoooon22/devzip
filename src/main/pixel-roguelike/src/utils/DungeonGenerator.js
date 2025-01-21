// DungeonGenerator.js
import { initializeDungeon, createOuterWalls, createRooms, createDoors } from '../components/objects/Structures.js';
import { placePlayer } from '../components/objects/Player.js';
import { placeEnemies } from '../components/objects/Enemy.js';
import { placeBoss } from '../components/objects/Boss.js';

export const generateDungeon = () => {
  const dungeon = initializeDungeon();
  createOuterWalls(dungeon);
  const rooms = createRooms(dungeon);
  createDoors(dungeon, rooms);
  placePlayer(dungeon);  // 던전에 플레이어 배치
  placeEnemies(dungeon);
  placeBoss(dungeon);
  return dungeon;
};
