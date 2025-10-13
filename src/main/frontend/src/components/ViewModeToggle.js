import React from 'react';
import './ViewModeToggle.scss';

const ViewModeToggle = ({ isProductionMode, onToggle }) => {
  return (
    <div className="view-mode-toggle">
      <button
        className={`toggle-button ${isProductionMode ? 'production' : 'experimental'}`}
        onClick={onToggle}
        aria-label={isProductionMode ? "Switch to Experimental Mode" : "Switch to Production Mode"}
      >
        <span className="toggle-slider">
          <span className="toggle-icon">
            {isProductionMode ? '🚀' : '🧪'}
          </span>
        </span>
        <span className="toggle-label">
          {isProductionMode ? 'Production' : 'Experimental'}
        </span>
      </button>
    </div>
  );
};

export default ViewModeToggle;
