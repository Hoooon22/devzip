export const placeEnemies = (dungeon, chance = 0.03) => {
    for (let x = 1; x < dungeon[0].length - 1; x++) {
      for (let y = 1; y < dungeon.length - 1; y++) {
        if (Math.random() < chance && dungeon[y][x] === 'F') {
          dungeon[y][x] = 'E'; // E: Enemy (적) 생성
        }
      }
    }
  };
  