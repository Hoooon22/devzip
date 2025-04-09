import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import EventLogTable from '../../components/traceboard/EventLogTable';
import VisitorMetrics from '../../components/traceboard/VisitorMetrics';
import UserBehaviorChart from '../../components/traceboard/UserBehaviorChart';

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

const TraceBoard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);
  
  useEffect(() => {
    // 실제 구현에서는 API에서 데이터를 가져옴
    const fetchData = async () => {
      try {
        setLoading(true);
        // 예시 데이터 - 실제 구현에서는 API 호출
        const demoData = Array.from({ length: 50 }).map((_, i) => ({
          id: i + 1,
          timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
          eventType: ['pageView', 'click', 'scroll', 'formSubmit'][Math.floor(Math.random() * 4)],
          path: ['/', '/about', '/products', '/contact'][Math.floor(Math.random() * 4)],
          userId: `user_${Math.floor(Math.random() * 100)}`,
          deviceType: ['mobile', 'tablet', 'desktop'][Math.floor(Math.random() * 3)],
          browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)],
        }));
        
        setEventLogs(demoData);
        setLoading(false);
      } catch (err) {
        console.error('데이터 가져오기 실패:', err);
        setError('이벤트 로그를 불러오는 중 문제가 발생했습니다.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  return (
    <PageContainer>
      <Header>
        <Title>TraceBoard</Title>
        <Description>웹사이트 사용자 행동을 시각화하는 로그 대시보드</Description>
      </Header>
      
      {loading ? (
        <p>데이터를 불러오는 중입니다...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <>
          <GridContainer>
            <VisitorMetrics eventLogs={eventLogs} />
          </GridContainer>
          
          <FullWidthSection>
            <UserBehaviorChart eventLogs={eventLogs} />
          </FullWidthSection>
          
          <FullWidthSection>
            <EventLogTable eventLogs={eventLogs} />
          </FullWidthSection>
        </>
      )}
    </PageContainer>
  );
};

export default TraceBoard; 