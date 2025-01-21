import { useGameStore } from "../store/gameStore";

const GameCanvas = () => { 
    const dungeon = useGameStore((state) => state.dungeon);
    const updateDungeon = useGameStore((state) => state.updateDungeon);

    return (
        <div>
            <canvas id="gameCanvas" width="600" height="600"></canvas>
        </div>
    );
};