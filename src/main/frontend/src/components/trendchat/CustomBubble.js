import React from "react";

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

export default CustomBubble;
