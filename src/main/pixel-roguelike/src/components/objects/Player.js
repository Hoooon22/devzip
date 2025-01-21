// Player.js
export const placePlayer = (dungeon) => {
    let playerPlaced = false;
    let playerPosition = { row: 0, col: 0 };

    while (!playerPlaced) {
        // 랜덤 위치를 선택해서 플레이어를 배치
        const randomRow = Math.floor(Math.random() * dungeon.length);
        const randomCol = Math.floor(Math.random() * dungeon[randomRow].length);

        // 플레이어가 놓을 수 있는지 체크 (Floor일 경우에만)
        if (dungeon[randomRow][randomCol] === 'F') {
            dungeon[randomRow][randomCol] = 'P';  // 플레이어를 'P'로 표시
            playerPosition = { row: randomRow, col: randomCol };
            playerPlaced = true;  // 배치가 완료되었음을 알림
        }
    }

    return playerPosition;
};

export const movePlayer = (dungeon, playerPosition, direction) => {
    const { row, col } = playerPosition;
    let newRow = row;
    let newCol = col;
    
    switch (direction) {
        case 'ArrowUp':
            newRow = row - 1;
            break;
        case 'ArrowDown':
            newRow = row + 1;
            break;
        case 'ArrowLeft':
            newCol = col - 1;
            break;
        case 'ArrowRight':
            newCol = col + 1;
            break;
        default:
            break;
    }

    // 던전의 경계를 벗어나지 않는지 확인
    if (newRow >= 0 && newRow < dungeon.length && newCol >= 0 && newCol < dungeon[0].length) {
        // 플레이어가 이동할 수 있는지 체크 (Floor일 경우에만)
        if (dungeon[newRow][newCol] === 'F') {
            dungeon[row][col] = 'F';  // 이전 위치를 'F'로 표시
            dungeon[newRow][newCol] = 'P';  // 새로운 위치를 'P'로 표시
            return { row: newRow, col: newCol }; // 새로운 위치 반환
        }
    }

    return playerPosition;
};
