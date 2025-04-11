import React from "react";
import PropTypes from "prop-types";

// Recharts의 Shape 렌더링 컴포넌트로 작동하는 CustomBubble
const CustomBubble = (props) => {
  const { cx, cy, r, payload, fill, onBubbleClick } = props;
  
  if (!cx || !cy || !payload || !payload.name) {
    console.error("필수 props 누락:", { cx, cy, payload });
    return null;
  }
  
  // 안전하게 반지름 계산 - r이 있으면 사용, 없으면 payload.z에서 계산
  const radius = r || (payload.z ? Math.sqrt(Math.abs(payload.z) / Math.PI) / 2 : 20);
  
  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={payload.fill || fill || "#8884d8"}
      stroke="white"
      strokeWidth="2"
      style={{ cursor: 'pointer' }}
      onClick={() => {
        console.log("버블 클릭됨:", payload.name);
        if (onBubbleClick) onBubbleClick(payload.name);
      }}
    />
  );
};

CustomBubble.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  r: PropTypes.number,
  fill: PropTypes.string,
  payload: PropTypes.shape({
    name: PropTypes.string.isRequired,
    fill: PropTypes.string,
    z: PropTypes.number
  }),
  onBubbleClick: PropTypes.func
};

CustomBubble.defaultProps = {
  cx: 0,
  cy: 0,
  r: 20,
  fill: "#8884d8"
};

export default CustomBubble;