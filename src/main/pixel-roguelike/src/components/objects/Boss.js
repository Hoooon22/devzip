export const placeBoss = (dungeon) => {
    while (true) {
      const x = Math.floor(Math.random() * (dungeon[0].length - 2)) + 1;
      const y = Math.floor(Math.random() * (dungeon.length - 2)) + 1;
      if (dungeon[y][x] === 'F') {
        dungeon[y][x] = 'B'; // B: Boss (보스) 배치
        break;
      }
    }
  };
  