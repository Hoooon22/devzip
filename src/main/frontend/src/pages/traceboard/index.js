import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import EventLogTable from '../../components/traceboard/EventLogTable';
import VisitorMetrics from '../../components/traceboard/VisitorMetrics';
import UserBehaviorChart from '../../components/traceboard/UserBehaviorChart';
import { getDashboardData } from '../../services/traceboard/api';

const PageContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (min-width: 768px) {
    padding: 32px;
  }
`;

const Header = styled.header`
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
  
  @media (min-width: 768px) {
    font-size: 32px;
  }
`;

const Description = styled.p`
  color: #64748b;
  font-size: 16px;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const FullWidthSection = styled.section`
  grid-column: 1 / -1;
`;

const ErrorMessage = styled.div`
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 24px;
  color: #b91c1c;
`;

const TimeRangeSelector = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
`;

const TimeButton = styled.button`
  background-color: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#334155'};
  border: 1px solid ${props => props.active ? '#3b82f6' : '#cbd5e1'};
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? '#2563eb' : '#f1f5f9'};
  }
`;

const TraceBoard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    visitorMetrics: {},
    eventTypeMetrics: {},
    deviceTypeMetrics: {},
    recentLogs: []
  });
  const [timeRange, setTimeRange] = useState('week'); // day, week, month
  
  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 시간 범위에 따른 시작 날짜 설정
      const end = new Date();
      let start;
      
      switch(timeRange) {
        case 'day':
          start = new Date(end);
          start.setDate(end.getDate() - 1);
          break;
        case 'month':
          start = new Date(end);
          start.setMonth(end.getMonth() - 1);
          break;
        case 'week':
        default:
          start = new Date(end);
          start.setDate(end.getDate() - 7);
          break;
      }
      
      try {
        // API 호출
        const response = await getDashboardData(start, end);
        
        if (response.success) {
          setDashboardData(response.data);
        } else {
          throw new Error(response.message || '데이터를 가져오는데 실패했습니다.');
        }
      } catch (apiError) {
        console.error('API 호출 실패:', apiError);
        
        // API 호출 실패 시 더미 데이터 생성
        const demoData = generateDemoData(start, end);
        setDashboardData(demoData);
        
        // 개발 환경에서는 경고 메시지만 표시, 프로덕션에서는 오류 메시지 표시
        if (process.env.NODE_ENV === 'production') {
          setError('서버에서 데이터를 불러오는데 실패했습니다. 개발자에게 문의하세요.');
        } else {
          console.warn('실제 API 연동 실패, 더미 데이터를 사용합니다.');
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('데이터 처리 오류:', err);
      setError('데이터를 불러오는 중 문제가 발생했습니다.');
      setLoading(false);
    }
  };
  
  // 더미 데이터 생성 함수
  const generateDemoData = (start, end) => {
    // 랜덤 이벤트 로그 생성
    const eventLogs = Array.from({ length: 50 }).map((_, i) => ({
      id: i + 1,
      timestamp: new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
      ).toISOString(),
      eventType: ['pageView', 'click', 'scroll', 'formSubmit'][Math.floor(Math.random() * 4)],
      path: ['/', '/about', '/products', '/contact'][Math.floor(Math.random() * 4)],
      userId: `user_${Math.floor(Math.random() * 100)}`,
      deviceType: ['mobile', 'tablet', 'desktop'][Math.floor(Math.random() * 3)],
      browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)],
    }));
    
    // 방문자 지표 계산
    const uniqueUserIds = new Set(eventLogs.map(log => log.userId));
    const pageViews = eventLogs.filter(log => log.eventType === 'pageView').length;
    
    // 이벤트 유형별 카운트
    const eventTypeCount = {
      pageView: eventLogs.filter(log => log.eventType === 'pageView').length,
      click: eventLogs.filter(log => log.eventType === 'click').length,
      scroll: eventLogs.filter(log => log.eventType === 'scroll').length,
      formSubmit: eventLogs.filter(log => log.eventType === 'formSubmit').length,
    };
    
    // 디바이스 유형별 카운트
    const deviceTypeCount = {
      mobile: eventLogs.filter(log => log.deviceType === 'mobile').length,
      tablet: eventLogs.filter(log => log.deviceType === 'tablet').length,
      desktop: eventLogs.filter(log => log.deviceType === 'desktop').length,
    };
    
    return {
      visitorMetrics: {
        uniqueVisitors: uniqueUserIds.size,
        totalPageViews: pageViews,
        pageViewsPerVisitor: uniqueUserIds.size > 0 ? pageViews / uniqueUserIds.size : 0,
      },
      eventTypeMetrics: eventTypeCount,
      deviceTypeMetrics: deviceTypeCount,
      recentLogs: eventLogs,
    };
  };
  
  return (
    <PageContainer>
      <Header>
        <Title>TraceBoard</Title>
        <Description>웹사이트 사용자 행동을 시각화하는 로그 대시보드</Description>
      </Header>
      
      <TimeRangeSelector>
        <TimeButton 
          active={timeRange === 'day'} 
          onClick={() => setTimeRange('day')}
        >
          최근 24시간
        </TimeButton>
        <TimeButton 
          active={timeRange === 'week'} 
          onClick={() => setTimeRange('week')}
        >
          최근 7일
        </TimeButton>
        <TimeButton 
          active={timeRange === 'month'} 
          onClick={() => setTimeRange('month')}
        >
          최근 30일
        </TimeButton>
      </TimeRangeSelector>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {loading ? (
        <p>데이터를 불러오는 중입니다...</p>
      ) : (
        <>
          <GridContainer>
            <VisitorMetrics metrics={dashboardData.visitorMetrics} />
          </GridContainer>
          
          <FullWidthSection>
            <UserBehaviorChart eventLogs={dashboardData.recentLogs} />
          </FullWidthSection>
          
          <FullWidthSection>
            <EventLogTable eventLogs={dashboardData.recentLogs} />
          </FullWidthSection>
        </>
      )}
    </PageContainer>
  );
};

export default TraceBoard; 