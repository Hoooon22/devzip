import { create } from 'zustand';
import { generateDungeon } from '../../utils/DungeonGenerator.js';

export const useGameStore = create((set) => ({
  dungeon: generateDungeon(),
  regenerateDungeon: () => set({ dungeon: generateDungeon() }),
}));
