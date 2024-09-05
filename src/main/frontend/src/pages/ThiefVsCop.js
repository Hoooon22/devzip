import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

const ThiefVsCop = () => {
  const gameContainer = useRef(null);

  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 }
        }
      },
      scene: {
        preload: preload,
        create: create,
        update: update
      },
      parent: gameContainer.current
    };

    const game = new Phaser.Game(config);

    function preload() {
      this.load.image('background', 'https://example.com/background.png'); // 배경 이미지 URL
    }

    function create() {
      this.add.image(400, 300, 'background');
      // 다른 게임 요소들을 여기서 추가할 수 있음
    }

    function update() {
      // 게임 상태를 매 프레임마다 업데이트
    }

    return () => {
      game.destroy(true); // 컴포넌트가 언마운트될 때 Phaser 게임을 정리
    };
  }, []);

  return <div ref={gameContainer} />;
};

export default ThiefVsCop;
