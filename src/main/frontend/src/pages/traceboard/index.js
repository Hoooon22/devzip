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

const NoDataMessage = styled.div`
  text-align: center;
  padding: 40px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
  margin-bottom: 24px;
  color: #64748b;
  
  h3 {
    font-size: 18px;
    margin-bottom: 8px;
    color: #0f172a;
  }
  
  p {
    margin-bottom: 0;
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
      
      console.log(`대시보드 데이터 요청: ${start.toISOString()} - ${end.toISOString()}`);
      
      try {
        // API 직접 호출하여 원시 응답 확인
        const rawResponse = await fetch(`/api/traceboard/dashboard?start=${start.toISOString()}&end=${end.toISOString()}`);
        const rawData = await rawResponse.json();
        console.log('서버 원시 응답 데이터:', rawData);
      } catch (e) {
        console.warn('원시 응답 확인 중 오류:', e);
      }
      
      // API 호출
      const response = await getDashboardData(start, end);
      console.log('API 응답 전체 데이터:', response);
      
      if (response.success && response.data) {
        // 서버 데이터 사용
        console.log('서버에서 데이터를 성공적으로 가져왔습니다.');
        
        // 데이터 포맷 변환 및 처리
        const processedData = processServerData(response.data);
        setDashboardData(processedData);
      } else {
        console.warn('서버 데이터를 가져오는데 실패했습니다:', response.message);
        
        // API가 반환한 전체 응답을 검사하여 대안 데이터 찾기
        if (response.data === null && response) {
          console.log('응답 객체 전체를 검사하여 데이터 구조 확인...');
          
          // response 내에 유효한 데이터가 있는지 확인
          let alternativeData = null;
          
          if (response.events) {
            alternativeData = response.events;
            console.log('events 필드에서 데이터 발견');
          } else if (response.data && Array.isArray(response.data)) {
            alternativeData = response.data;
            console.log('data 배열 필드에서 데이터 발견');
          } else if (Array.isArray(response)) {
            alternativeData = response;
            console.log('응답 자체가 배열 타입');
          }
          
          if (alternativeData) {
            const processedData = processServerData(alternativeData);
            setDashboardData(processedData);
            setLoading(false);
            return;
          }
        }
        
        // 실패 시 더미 데이터 사용
        if (process.env.NODE_ENV !== 'production') {
          console.log('개발 환경에서 더미 데이터를 사용합니다.');
          const demoData = generateDemoData(start, end);
          setDashboardData(demoData);
        } else {
          throw new Error(response.message || '서버에서 데이터를 가져오는데 실패했습니다.');
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('데이터 처리 오류:', err);
      setError('데이터를 불러오는 중 문제가 발생했습니다: ' + err.message);
      setLoading(false);
      
      // 개발 환경에서는 오류가 발생해도 더미 데이터로 UI 표시
      if (process.env.NODE_ENV !== 'production') {
        const end = new Date();
        let start = new Date(end);
        start.setDate(end.getDate() - 7); // 기본값으로 1주일
        
        console.log('오류 발생 시 더미 데이터를 사용합니다.');
        const demoData = generateDemoData(start, end);
        setDashboardData(demoData);
      }
    }
  };
  
  // 서버 데이터 가공 함수
  const processServerData = (serverData) => {
    // 디버깅을 위해 서버 데이터 구조 로깅
    console.log('서버 데이터 구조:', JSON.stringify(serverData, null, 2));
    
    // 방문자 지표
    const visitorMetrics = {
      uniqueVisitors: serverData.totalUsers || serverData.uniqueVisitors || 0,
      totalPageViews: serverData.totalPageViews || serverData.pageViews || (serverData.eventTypeDistribution?.pageView || 0),
      pageViewsPerVisitor: (serverData.totalUsers || serverData.uniqueVisitors) > 0 
        ? (serverData.totalPageViews || serverData.pageViews || (serverData.eventTypeDistribution?.pageView || 0)) / (serverData.totalUsers || serverData.uniqueVisitors) 
        : 0
    };
    
    // 이벤트 타입별 측정 (다양한 서버 응답 구조에 대응)
    let eventTypeMetrics = {
      pageView: 0,
      click: 0,
      scroll: 0,
      formSubmit: 0
    };
    
    // 서버 응답에서 이벤트 타입 분포 추출
    if (serverData.eventTypeDistribution) {
      eventTypeMetrics = serverData.eventTypeDistribution;
    } else if (serverData.eventTypeMetrics) {
      eventTypeMetrics = serverData.eventTypeMetrics;
    } else if (serverData.events) {
      // events가 배열인 경우 직접 계산
      const events = Array.isArray(serverData.events) ? serverData.events : [];
      eventTypeMetrics = {
        pageView: events.filter(e => e.eventType === 'pageView').length,
        click: events.filter(e => e.eventType === 'click').length,
        scroll: events.filter(e => e.eventType === 'scroll').length,
        formSubmit: events.filter(e => e.eventType === 'formSubmit').length
      };
    }
    
    // 디바이스 타입별 측정 (다양한 서버 응답 구조에 대응)
    let deviceTypeMetrics = {
      mobile: 0,
      tablet: 0,
      desktop: 0
    };
    
    // 서버 응답에서 디바이스 타입 분포 추출
    if (serverData.deviceDistribution) {
      deviceTypeMetrics = serverData.deviceDistribution;
    } else if (serverData.deviceTypeMetrics) {
      deviceTypeMetrics = serverData.deviceTypeMetrics;
    } else if (serverData.events) {
      // events가 배열인 경우 직접 계산
      const events = Array.isArray(serverData.events) ? serverData.events : [];
      deviceTypeMetrics = {
        mobile: events.filter(e => e.deviceType === 'mobile').length,
        tablet: events.filter(e => e.deviceType === 'tablet').length,
        desktop: events.filter(e => e.deviceType === 'desktop').length
      };
    }
    
    // 최근 로그 목록
    let recentLogs = [];
    
    // 서버 응답에서 이벤트 로그 추출
    if (Array.isArray(serverData.recentLogs)) {
      recentLogs = serverData.recentLogs;
    } else if (Array.isArray(serverData.events)) {
      recentLogs = serverData.events;
    } else if (Array.isArray(serverData.data)) {
      recentLogs = serverData.data;
    } else if (Array.isArray(serverData)) {
      recentLogs = serverData;
    }
    
    // 이벤트 로그 형식 확인 및 변환
    if (recentLogs.length > 0) {
      console.log('이벤트 로그 샘플:', recentLogs[0]);
      
      // 필드 이름이 다른 경우 매핑
      recentLogs = recentLogs.map(log => ({
        id: log.id || log._id || Math.floor(Math.random() * 10000),
        timestamp: log.timestamp || log.occurredAt || log.createdAt || new Date().toISOString(),
        eventType: log.eventType || log.type || 'unknown',
        path: log.path || log.url || '/',
        userId: log.userId || log.user_id || 'anonymous',
        deviceType: log.deviceType || log.device || 'unknown',
        browser: log.browser || log.browser_name || 'unknown'
      }));
    } else {
      // 서버에서 이벤트 로그를 찾지 못한 경우 분포 데이터로부터 더미 이벤트 로그 생성
      console.log('서버에서 이벤트 로그를 찾지 못해 분포 데이터로부터 더미 데이터를 생성합니다.');
      
      // 이벤트 타입 분포에서 이벤트 수 계산
      let totalEvents = 0;
      Object.values(eventTypeMetrics).forEach(count => {
        if (typeof count === 'number') totalEvents += count;
      });
      
      console.log(`총 이벤트 수: ${totalEvents}`);
      
      // 총 이벤트 수가 0보다 큰 경우에만 더미 데이터 생성
      if (totalEvents > 0) {
        // 현재 시간 기준으로 시간 범위 생성
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - 7); // 기본값으로 1주일 전으로 설정
        
        // 브라우저 분포
        const browserDistribution = serverData.browserDistribution || { 'Chrome': 1 };
        
        // 시간대별 분포 (있으면 사용, 없으면 균등 분포)
        const hourlyDistribution = serverData.hourlyDistribution || {};
        
        // 더미 이벤트 로그 생성
        recentLogs = [];
        
        // 이벤트 타입 및 수에 따라 로그 생성
        Object.entries(eventTypeMetrics).forEach(([eventType, count]) => {
          if (typeof count !== 'number' || count <= 0) return;
          
          for (let i = 0; i < count; i++) {
            // 날짜 생성 (시간 분포 고려)
            let randomDate;
            if (Object.keys(hourlyDistribution).length > 0) {
              // 시간 분포에 따라 가중치 부여
              const hours = Object.keys(hourlyDistribution);
              const randomHour = hours[Math.floor(Math.random() * hours.length)];
              const hour = parseInt(randomHour.replace('시', ''), 10);
              
              randomDate = new Date(startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime()));
              randomDate.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
            } else {
              randomDate = new Date(startDate.getTime() + Math.random() * (now.getTime() - startDate.getTime()));
            }
            
            // 브라우저 선택
            const browsers = Object.keys(browserDistribution);
            const randomBrowser = browsers[Math.floor(Math.random() * browsers.length)];
            
            // 디바이스 타입 선택 (0이 아닌 값만)
            const validDeviceTypes = Object.entries(deviceTypeMetrics)
              .filter(([_, count]) => count > 0)
              .map(([type]) => type);
            
            const deviceType = validDeviceTypes.length > 0 
              ? validDeviceTypes[Math.floor(Math.random() * validDeviceTypes.length)]
              : 'desktop';
            
            recentLogs.push({
              id: recentLogs.length + 1,
              timestamp: randomDate.toISOString(),
              eventType: eventType,
              path: ['/', '/about', '/products', '/contact', '/traceboard'][Math.floor(Math.random() * 5)],
              userId: `user_${Math.floor(Math.random() * 10) + 1}`,
              deviceType: deviceType,
              browser: randomBrowser
            });
          }
        });
        
        // 시간순 정렬 (최신순)
        recentLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log(`더미 이벤트 로그 ${recentLogs.length}개 생성 완료`);
      } else {
        console.warn('이벤트 데이터가 없어 더미 데이터를 생성할 수 없습니다.');
      }
    }
    
    console.log('변환된 데이터:', {
      visitorMetrics,
      eventTypeMetrics,
      deviceTypeMetrics,
      recentLogs: recentLogs.length
    });
    
    return {
      visitorMetrics,
      eventTypeMetrics,
      deviceTypeMetrics,
      recentLogs
    };
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
  
  // 데이터가 비어있는지 확인
  const hasNoData = !loading && !error && 
    (!dashboardData.recentLogs || dashboardData.recentLogs.length === 0);
  
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
      ) : hasNoData ? (
        <NoDataMessage>
          <h3>데이터가 없습니다</h3>
          <p>선택한 기간 동안 기록된 이벤트가 없습니다. 다른 기간을 선택하거나 나중에 다시 확인해 주세요.</p>
        </NoDataMessage>
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