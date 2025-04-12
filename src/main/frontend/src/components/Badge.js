import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

// 배지 배경색 설정
const getBgColor = (bg) => {
  // 색상 코드(#으로 시작)가 직접 전달된 경우 그대로 사용
  if (typeof bg === 'string' && bg.startsWith('#')) {
    return bg;
  }
  
  // 미리 정의된 색상값 사용
  switch(bg) {
    case 'primary': return '#3b82f6';
    case 'success': return '#10b981';
    case 'warning': return '#f59e0b';
    case 'danger': return '#ef4444';
    case 'info': return '#06b6d4';
    case 'secondary': return '#6b7280';
    default: return '#6b7280';
  }
};

// 배지 스타일 컴포넌트
const BadgeContainer = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  vertical-align: baseline;
  border-radius: 0.25rem;
  background-color: ${props => getBgColor(props.bg)};
  color: white;
`;

// Badge 컴포넌트
const Badge = ({ bg, children }) => {
  return (
    <BadgeContainer bg={bg}>
      {children}
    </BadgeContainer>
  );
};

Badge.propTypes = {
  bg: PropTypes.string,
  children: PropTypes.node.isRequired
};

Badge.defaultProps = {
  bg: 'secondary'
};

export default Badge; 