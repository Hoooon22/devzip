import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const MetricsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 24px;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const MetricCard = styled.div`
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 16px;
`;

const MetricTitle = styled.h3`
  font-size: 14px;
  color: #64748b;
  margin: 0 0 8px 0;
  font-weight: 500;
`;

const MetricValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: baseline;
`;

const MetricTrend = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.positive ? '#10b981' : '#ef4444'};
`;

/**
 * 방문자 지표를 표시하는 컴포넌트
 * @param {Object} props
 * @param {Object} props.metrics - 방문자 관련 지표 데이터
 */
const VisitorMetrics = ({ metrics }) => {
  // 대시보드 API가 제공하는 지표 또는 기본값 사용
  const {
    uniqueVisitors = 0,
    totalPageViews = 0,
    pageViewsPerVisitor = 0,
    mostVisitedPage = { path: '-', count: 0 },
    mobilePercentage = 0
  } = metrics;
  
  return (
    <MetricsContainer>
      <MetricCard>
        <MetricTitle>고유 방문자</MetricTitle>
        <MetricValue>
          {uniqueVisitors}
          <MetricTrend positive={true}>
            <span style={{ marginRight: '2px' }}>↑</span> 12.5%
          </MetricTrend>
        </MetricValue>
      </MetricCard>
      
      <MetricCard>
        <MetricTitle>총 페이지뷰</MetricTitle>
        <MetricValue>
          {totalPageViews}
          <MetricTrend positive={true}>
            <span style={{ marginRight: '2px' }}>↑</span> 8.3%
          </MetricTrend>
        </MetricValue>
      </MetricCard>
      
      <MetricCard>
        <MetricTitle>방문자당 페이지뷰</MetricTitle>
        <MetricValue>
          {typeof pageViewsPerVisitor === 'number' 
            ? pageViewsPerVisitor.toFixed(1) 
            : pageViewsPerVisitor}
          <MetricTrend positive={pageViewsPerVisitor > 2}>
            <span style={{ marginRight: '2px' }}>{pageViewsPerVisitor > 2 ? '↑' : '↓'}</span>
            {pageViewsPerVisitor > 2 ? '5.2%' : '2.1%'}
          </MetricTrend>
        </MetricValue>
      </MetricCard>
      
      <MetricCard>
        <MetricTitle>가장 많이 방문한 페이지</MetricTitle>
        <MetricValue style={{ fontSize: '18px' }}>
          {mostVisitedPage.path || '-'}
        </MetricValue>
        {mostVisitedPage && mostVisitedPage.count > 0 && (
          <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            {mostVisitedPage.count} 페이지뷰
          </div>
        )}
      </MetricCard>
      
      <MetricCard>
        <MetricTitle>모바일 사용자 비율</MetricTitle>
        <MetricValue>
          {mobilePercentage}%
          <MetricTrend positive={mobilePercentage > 40}>
            <span style={{ marginRight: '2px' }}>↑</span> 3.7%
          </MetricTrend>
        </MetricValue>
      </MetricCard>
    </MetricsContainer>
  );
};

VisitorMetrics.propTypes = {
  metrics: PropTypes.shape({
    uniqueVisitors: PropTypes.number,
    totalPageViews: PropTypes.number,
    pageViewsPerVisitor: PropTypes.number,
    mostVisitedPage: PropTypes.oneOfType([
      PropTypes.shape({
        path: PropTypes.string,
        count: PropTypes.number
      }),
      PropTypes.array // 이전 형식 지원을 위해 배열 타입도 허용
    ]),
    mobilePercentage: PropTypes.number
  })
};

VisitorMetrics.defaultProps = {
  metrics: {
    uniqueVisitors: 0,
    totalPageViews: 0,
    pageViewsPerVisitor: 0,
    mostVisitedPage: { path: '-', count: 0 },
    mobilePercentage: 0
  }
};

export default VisitorMetrics; 