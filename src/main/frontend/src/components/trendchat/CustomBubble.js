import React from "react";
import PropTypes from "prop-types";

// Recharts의 Shape 렌더링 컴포넌트로 작동하는 CustomBubble
const CustomBubble = (props) => {
  const { cx, cy, payload, fill, onBubbleClick } = props;
  
  // 초기 렌더링 시 비어있는 값으로 호출될 수 있으므로 조용히 null 반환
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  
  // 안전하게 payload.name 접근
  const name = payload.name || '';
  
  // 좌표 확인
  if (!cx || !cy) {
    console.debug('유효하지 않은 좌표로 CustomBubble 렌더링 시도');
    return null;
  }
  
  // 안전하게 반지름 계산 - payload.z에서 계산
  const radius = payload.z ? Math.sqrt(Math.abs(payload.z) / Math.PI) / 2 : 20;
  
  // 보여줄 내용이 없으면 렌더링 안함
  if (!name) {
    return null;
  }
  
  // 클릭 핸들러 구현 - useCallback 제거 (컴포넌트가 매번 다시 렌더링됨)
  const handleClick = (e) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    if (name && onBubbleClick) {
      console.log("버블 클릭됨:", name);
      onBubbleClick(name);
    }
  };
  
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={payload.fill || fill}
        stroke="white"
        strokeWidth="2"
        style={{ 
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onClick={handleClick}
        onTouchEnd={handleClick} // 모바일 터치 지원
      />
    </g>
  );
};

CustomBubble.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
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
  fill: "#8884d8",
  payload: { name: "" }
};

export default CustomBubble;