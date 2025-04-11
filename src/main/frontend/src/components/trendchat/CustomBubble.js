import React from "react";
import PropTypes from "prop-types";

// Recharts의 Shape 렌더링 컴포넌트로 작동하는 CustomBubble
const CustomBubble = (props) => {
  const { cx = 0, cy = 0, r, payload = {}, fill = "#8884d8", onBubbleClick } = props;
  
  // 초기 렌더링 시 비어있는 값으로 호출될 수 있으므로 조용히 null 반환
  if (payload === null || typeof payload !== 'object') {
    return null;
  }
  
  // 안전하게 payload.name 접근
  const name = payload.name || '';
  
  // 내부 로깅은 개발 모드에서만 진행
  if (process.env.NODE_ENV === 'development' && (!cx && !cy)) {
    console.debug('비어있는 좌표로 CustomBubble 렌더링 시도');
  }
  
  // 안전하게 반지름 계산 - r이 있으면 사용, 없으면 payload.z에서 계산
  const radius = r || (payload.z ? Math.sqrt(Math.abs(payload.z) / Math.PI) / 2 : 20);
  
  // 보여줄 내용이 없으면 렌더링 안함
  if (!name) {
    return null;
  }
  
  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={payload.fill || fill}
      stroke="white"
      strokeWidth="2"
      style={{ cursor: 'pointer' }}
      onClick={() => {
        if (name && onBubbleClick) {
          console.log("버블 클릭됨:", name);
          onBubbleClick(name);
        }
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
    name: PropTypes.string,
    fill: PropTypes.string,
    z: PropTypes.number
  }),
  onBubbleClick: PropTypes.func
};

CustomBubble.defaultProps = {
  cx: 0,
  cy: 0,
  r: 20,
  fill: "#8884d8",
  payload: { name: "" }
};

export default CustomBubble;