import React from "react";
import PropTypes from "prop-types";

const CustomBubble = (props) => {
  const { cx, cy, payload, size, onBubbleClick } = props;
  // size 값을 면적으로 간주하여 반지름 계산 (Recharts 기본 처리와 동일)
  const radius = Math.sqrt(size);
  
  const bubbleId = `bubble-${payload.name.replace(/\s+/g, '-').toLowerCase()}`;
  
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${payload.name} 버블`}
      aria-describedby={bubbleId}
      onClick={() => onBubbleClick(payload.name)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onBubbleClick(payload.name);
        }
      }}
      style={{
        cursor: 'pointer',
        minWidth: '44px',
        minHeight: '44px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <span id={bubbleId} style={{ display: 'none' }}>
        {`${payload.name} 관련 정보를 확인하려면 클릭하세요`}
      </span>
      <svg width={radius * 2 + 4} height={radius * 2 + 4}>
        <circle
          cx={radius + 2}
          cy={radius + 2}
          r={radius}
          fill={payload.fill}
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

CustomBubble.propTypes = {
  cx: PropTypes.number.isRequired,
  cy: PropTypes.number.isRequired,
  size: PropTypes.number.isRequired,
  payload: PropTypes.shape({
    name: PropTypes.string.isRequired,
    fill: PropTypes.string.isRequired
  }).isRequired,
  onBubbleClick: PropTypes.func.isRequired
};

export default CustomBubble;