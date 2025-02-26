import React from "react";

const CustomBubble = (props) => {
    const { cx, cy, payload, size } = props;
    // size 값을 면적으로 간주하고, 반지름을 계산합니다.
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
      />
    );
  };
  
  export default CustomBubble;
  