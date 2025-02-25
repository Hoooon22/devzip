import React from "react";

const CustomBubble = (props) => {
  const { cx, cy, payload, size } = props;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={size / 2}
      fill={payload.fill}
      stroke="white"
      strokeWidth="2"
      filter="url(#shadow)"
    />
  );
};

export default CustomBubble;
