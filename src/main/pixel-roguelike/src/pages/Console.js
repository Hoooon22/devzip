import React, { useState, useEffect, useRef } from 'react';
import '../assets/css/Console.css';

const Console = ({ messages = [] }) => {
  const [consoleMessages, setConsoleMessages] = useState([]);
  const consoleEndRef = useRef(null);

  useEffect(() => {
    setConsoleMessages(messages);
  }, [messages]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleMessages]);

  return (
    <div className="console-container">
      <div className="console-content">
        {consoleMessages.map((message, index) => (
          <div key={index} className="console-message">
            {message}
          </div>
        ))}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
};

export default Console;