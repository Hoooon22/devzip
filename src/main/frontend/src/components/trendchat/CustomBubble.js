import React from "react";
import PropTypes from "prop-types";

const CustomBubble = (props) => {
  const { cx, cy, payload, size, fill, onBubbleClick } = props;
  // size 값을 면적으로 간주하여 반지름 계산 (Recharts 기본 처리와 동일)
  const radius = Math.sqrt(Math.abs(size || 400));
  
  const bubbleId = `bubble-${payload.name.replace(/\s+/g, '-').toLowerCase()}`;
  
  if (!cx || !cy || !payload || !payload.name) {
    console.error("필수 props 누락:", { cx, cy, payload });
    return null;
  }
  
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={payload.fill || fill || "#8884d8"}
        stroke="white"
        strokeWidth="2"
        style={{ cursor: 'pointer' }}
        onClick={() => onBubbleClick(payload.name)}
      />
      {/* 접근성을 위한 요소들 */}
      <title id={bubbleId}>{`${payload.name} 관련 정보를 확인하려면 클릭하세요`}</title>
    </g>
  );
};

CustomBubble.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  size: PropTypes.number,
  fill: PropTypes.string,
  payload: PropTypes.shape({
    name: PropTypes.string.isRequired,
    fill: PropTypes.string
  }),
  onBubbleClick: PropTypes.func.isRequired
};

// 기본값 설정
CustomBubble.defaultProps = {
  cx: 0,
  cy: 0,
  size: 400,
  fill: "#8884d8",
  payload: {
    name: "키워드",
    fill: "#8884d8"
  }
};

export default CustomBubble;