import React from "react";
import PropTypes from "prop-types";

const CustomBubble = (props) => {
  const { cx, cy, payload, size, onBubbleClick } = props;
  // size 값을 면적으로 간주하여 반지름 계산 (Recharts 기본 처리와 동일)
  const radius = Math.sqrt(size);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={payload.fill}
      stroke="white"
      strokeWidth="2"
      filter="url(#shadow)"
      style={{ cursor: "pointer" }}
      onClick={() => onBubbleClick(payload.name)}
    />
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