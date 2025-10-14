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
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05);
  padding: 20px;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
    border-color: #cbd5e1;
  }

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const MetricTitle = styled.h3`
  font-size: 13px;
  color: #64748b;
  margin: 0 0 12px 0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (max-width: 768px) {
    font-size: 12px;
    margin-bottom: 10px;
  }
`;

const MetricValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: baseline;
  gap: 8px;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const MetricTrend = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.positive ? '#059669' : '#dc2626'};
  background-color: ${props => props.positive ? '#d1fae5' : '#fee2e2'};

  @media (max-width: 768px) {
    font-size: 11px;
    padding: 3px 6px;
  }
`;

/**
 * 방문자 지표를 표시하는 컴포넌트
 * @param {Object} props
 * @param {Object} props.metrics - 방문자 관련 지표 데이터
 * @param {Object} props.trends - 증감률 데이터 (선택적)
 */
const VisitorMetrics = ({ metrics, trends }) => {
  // 대시보드 API가 제공하는 지표 또는 기본값 사용
  const {
    uniqueVisitors = 0,
    totalPageViews = 0,
    pageViewsPerVisitor = 0,
    mostVisitedPage = { path: '-', count: 0 },
    mobilePercentage = 0
  } = metrics;

  // 트렌드 데이터 추출 (기본값: 0)
  const {
    uniqueVisitors: uniqueVisitorsTrend = 0,
    totalPageViews: totalPageViewsTrend = 0,
    pageViewsPerVisitor: pageViewsPerVisitorTrend = 0
  } = trends || {};

  /**
   * 트렌드 표시를 위한 헬퍼 함수
   * @param {number} trend - 증감률 (%)
   * @returns {Object} - 트렌드 표시 정보
   */
  const getTrendDisplay = (trend) => {
    const isPositive = trend > 0;
    const isNegative = trend < 0;
    const isNeutral = trend === 0;

    return {
      isPositive,
      isNegative,
      isNeutral,
      arrow: isPositive ? '↑' : isNegative ? '↓' : '→',
      value: isNeutral ? '0.0%' : `${Math.abs(trend).toFixed(1)}%`
    };
  };

  const uniqueVisitorsTrendDisplay = getTrendDisplay(uniqueVisitorsTrend);
  const totalPageViewsTrendDisplay = getTrendDisplay(totalPageViewsTrend);
  const pageViewsPerVisitorTrendDisplay = getTrendDisplay(pageViewsPerVisitorTrend);

  return (
    <MetricsContainer>
      <MetricCard>
        <MetricTitle>고유 방문자</MetricTitle>
        <MetricValue>
          {uniqueVisitors.toLocaleString()}
          {!uniqueVisitorsTrendDisplay.isNeutral && (
            <MetricTrend positive={uniqueVisitorsTrendDisplay.isPositive}>
              <span style={{ marginRight: '2px' }}>{uniqueVisitorsTrendDisplay.arrow}</span>
              {uniqueVisitorsTrendDisplay.value}
            </MetricTrend>
          )}
        </MetricValue>
      </MetricCard>

      <MetricCard>
        <MetricTitle>총 페이지뷰</MetricTitle>
        <MetricValue>
          {totalPageViews.toLocaleString()}
          {!totalPageViewsTrendDisplay.isNeutral && (
            <MetricTrend positive={totalPageViewsTrendDisplay.isPositive}>
              <span style={{ marginRight: '2px' }}>{totalPageViewsTrendDisplay.arrow}</span>
              {totalPageViewsTrendDisplay.value}
            </MetricTrend>
          )}
        </MetricValue>
      </MetricCard>

      <MetricCard>
        <MetricTitle>방문자당 페이지뷰</MetricTitle>
        <MetricValue>
          {typeof pageViewsPerVisitor === 'number'
            ? pageViewsPerVisitor.toFixed(1)
            : pageViewsPerVisitor}
          {!pageViewsPerVisitorTrendDisplay.isNeutral && (
            <MetricTrend positive={pageViewsPerVisitorTrendDisplay.isPositive}>
              <span style={{ marginRight: '2px' }}>{pageViewsPerVisitorTrendDisplay.arrow}</span>
              {pageViewsPerVisitorTrendDisplay.value}
            </MetricTrend>
          )}
        </MetricValue>
      </MetricCard>

      <MetricCard>
        <MetricTitle>가장 많이 방문한 페이지</MetricTitle>
        <MetricValue style={{
          fontSize: '16px',
          wordBreak: 'break-all',
          fontWeight: 600,
          color: '#475569'
        }}>
          {mostVisitedPage.path || '-'}
        </MetricValue>
        {mostVisitedPage && mostVisitedPage.count > 0 && (
          <div style={{
            color: '#64748b',
            fontSize: '13px',
            marginTop: '10px',
            fontWeight: 500
          }}>
            <span style={{ color: '#3b82f6', fontWeight: 600 }}>
              {mostVisitedPage.count.toLocaleString()}
            </span>
            {' '}페이지뷰
          </div>
        )}
      </MetricCard>

      <MetricCard>
        <MetricTitle>모바일 사용자 비율</MetricTitle>
        <MetricValue>
          {mobilePercentage.toFixed(1)}%
        </MetricValue>
        <div style={{
          marginTop: '10px',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: mobilePercentage > 50 ? '#d1fae5' : '#e0e7ff',
          color: mobilePercentage > 50 ? '#059669' : '#4f46e5',
          display: 'inline-block'
        }}>
          {mobilePercentage > 50 ? '📱 모바일 우세' : '💻 데스크톱 우세'}
        </div>
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
  }),
  trends: PropTypes.shape({
    uniqueVisitors: PropTypes.number,
    totalPageViews: PropTypes.number,
    pageViewsPerVisitor: PropTypes.number
  })
};

VisitorMetrics.defaultProps = {
  metrics: {
    uniqueVisitors: 0,
    totalPageViews: 0,
    pageViewsPerVisitor: 0,
    mostVisitedPage: { path: '-', count: 0 },
    mobilePercentage: 0
  },
  trends: {
    uniqueVisitors: 0,
    totalPageViews: 0,
    pageViewsPerVisitor: 0
  }
};

export default VisitorMetrics; 