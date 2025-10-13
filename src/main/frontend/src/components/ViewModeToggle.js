import React from 'react';
import PropTypes from 'prop-types';
import './ViewModeToggle.scss';

const ViewModeToggle = ({ isProductionMode, onToggle }) => {
  return (
    <div className="view-mode-toggle">
      <button
        className={`toggle-button ${isProductionMode ? 'production' : 'experimental'}`}
        onClick={onToggle}
        aria-label={isProductionMode ? "Switch to Experimental Mode" : "Switch to Production Mode"}
      >
        <span className="toggle-track">
          <span className="toggle-label">
            {isProductionMode ? 'Production' : 'Experimental'}
          </span>
        </span>
        <span className="toggle-icon">
          {isProductionMode ? '🚀' : '🧪'}
        </span>
      </button>
    </div>
  );
};

ViewModeToggle.propTypes = {
  isProductionMode: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired
};

export default ViewModeToggle;
