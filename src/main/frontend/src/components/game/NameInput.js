// components/game/NameInput.js
import React, { useState } from 'react';
import '../../assets/css/NameInput.scss';

const NameInput = ({ onSubmit }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name);
    }
  };

  return (
    <div className="name-input-container">
      <form onSubmit={handleSubmit}>
        <label>
          Enter your name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </label>
        <button type="submit">Start Game</button>
      </form>
    </div>
  );
};

export default NameInput;
