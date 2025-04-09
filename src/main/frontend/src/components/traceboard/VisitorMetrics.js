import React, { useMemo } from 'react';
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

const VisitorMetrics = ({ eventLogs }) => {
  // 계산된 메트릭 값
  const metrics = useMemo(() => {
    if (!eventLogs.length) return {};
    
    // 고유 방문자 수
    const uniqueVisitors = new Set(eventLogs
      .filter(log => log.eventType === 'pageView')
      .map(log => log.userId)).size;
    
    // 총 페이지뷰 수
    const pageViews = eventLogs.filter(log => log.eventType === 'pageView').length;
    
    // 평균 페이지뷰 / 방문자
    const avgPageViewsPerVisitor = uniqueVisitors ? (pageViews / uniqueVisitors).toFixed(1) : 0;
    
    // 가장 많이 방문한 페이지
    const pageViewsByPath = eventLogs
      .filter(log => log.eventType === 'pageView')
      .reduce((acc, log) => {
        acc[log.path] = (acc[log.path] || 0) + 1;
        return acc;
      }, {});
    
    const mostVisitedPage = Object.entries(pageViewsByPath)
      .sort((a, b) => b[1] - a[1])[0] || ['-', 0];
    
    // 디바이스 유형별 방문자 수
    const deviceDistribution = eventLogs
      .filter(log => log.eventType === 'pageView')
      .reduce((acc, log) => {
        acc[log.deviceType] = (acc[log.deviceType] || 0) + 1;
        return acc;
      }, {});
    
    // 모바일 사용자 비율
    const mobileUsers = deviceDistribution.mobile || 0;
    const totalDeviceViews = Object.values(deviceDistribution).reduce((sum, val) => sum + val, 0);
    const mobilePercentage = totalDeviceViews ? Math.round((mobileUsers / totalDeviceViews) * 100) : 0;
    
    return {
      uniqueVisitors,
      pageViews,
      avgPageViewsPerVisitor,
      mostVisitedPage,
      mobilePercentage
    };
  }, [eventLogs]);
  
  return (
    <MetricsContainer>
      <MetricCard>
        <MetricTitle>고유 방문자</MetricTitle>
        <MetricValue>
          {metrics.uniqueVisitors || 0}
          <MetricTrend positive={true}>
            <span style={{ marginRight: '2px' }}>↑</span> 12.5%
          </MetricTrend>
        </MetricValue>
      </MetricCard>
      
      <MetricCard>
        <MetricTitle>총 페이지뷰</MetricTitle>
        <MetricValue>
          {metrics.pageViews || 0}
          <MetricTrend positive={true}>
            <span style={{ marginRight: '2px' }}>↑</span> 8.3%
          </MetricTrend>
        </MetricValue>
      </MetricCard>
      
      <MetricCard>
        <MetricTitle>방문자당 페이지뷰</MetricTitle>
        <MetricValue>
          {metrics.avgPageViewsPerVisitor || 0}
          <MetricTrend positive={metrics.avgPageViewsPerVisitor > 2}>
            <span style={{ marginRight: '2px' }}>{metrics.avgPageViewsPerVisitor > 2 ? '↑' : '↓'}</span>
            {metrics.avgPageViewsPerVisitor > 2 ? '5.2%' : '2.1%'}
          </MetricTrend>
        </MetricValue>
      </MetricCard>
      
      <MetricCard>
        <MetricTitle>가장 많이 방문한 페이지</MetricTitle>
        <MetricValue style={{ fontSize: '18px' }}>
          {metrics.mostVisitedPage ? metrics.mostVisitedPage[0] : '-'}
        </MetricValue>
        {metrics.mostVisitedPage && (
          <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            {metrics.mostVisitedPage[1]} 페이지뷰
          </div>
        )}
      </MetricCard>
      
      <MetricCard>
        <MetricTitle>모바일 사용자 비율</MetricTitle>
        <MetricValue>
          {metrics.mobilePercentage || 0}%
          <MetricTrend positive={metrics.mobilePercentage > 40}>
            <span style={{ marginRight: '2px' }}>↑</span> 3.7%
          </MetricTrend>
        </MetricValue>
      </MetricCard>
    </MetricsContainer>
  );
};

VisitorMetrics.propTypes = {
  eventLogs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      timestamp: PropTypes.string.isRequired,
      eventType: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      userId: PropTypes.string.isRequired,
      deviceType: PropTypes.string.isRequired,
      browser: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default VisitorMetrics; 