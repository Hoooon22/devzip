import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import VisitorChart from '../components/dashboard/VisitorChart';
import PageViewsTable from '../components/dashboard/PageViewsTable';

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  
  @media (min-width: 768px) {
    gap: 30px;
  }
  
  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 1440px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Card = styled.div`
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  
  @media (min-width: 768px) {
    padding: 24px;
  }
  
  @media (min-width: 1024px) {
    padding: 30px;
  }
`;

const CardTitle = styled.h3`
  color: #64748b;
  font-size: 14px;
  margin: 0 0 10px;
  
  @media (min-width: 768px) {
    font-size: 16px;
  }
`;

const CardValue = styled.div`
  color: #0f172a;
  font-size: 24px;
  font-weight: bold;
  
  @media (min-width: 768px) {
    font-size: 28px;
  }
  
  @media (min-width: 1024px) {
    font-size: 32px;
  }
`;

const CardTrend = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: center;
  color: ${props => props.positive ? '#10b981' : '#ef4444'};
  font-size: 14px;
`;

const FullWidthSection = styled.div`
  grid-column: 1 / -1;
`;

const Dashboard = () => {
  // 실제 구현에서는 API에서 데이터를 가져옵니다
  const [summaryData, setSummaryData] = useState({
    totalVisitors: 2450,
    totalPageViews: 8320,
    avgTimeOnSite: '3m 45s',
    bounceRate: '35.2%',
    newUsers: 1254,
    returningUsers: 1196
  });
  
  useEffect(() => {
    // API에서 데이터를 가져오는 로직
    // 예: fetchDashboardData()
  }, []);

  return (
    <DashboardLayout 
      title="대시보드" 
      description="웹사이트 트래픽과 사용자 행동을 한눈에 파악하세요."
    >
      <DashboardGrid>
        <Card>
          <CardTitle>총 방문자</CardTitle>
          <CardValue>{summaryData.totalVisitors.toLocaleString()}</CardValue>
          <CardTrend positive={true}>
            <span style={{ marginRight: '4px' }}>↑</span> 12.5% 증가
          </CardTrend>
        </Card>
        
        <Card>
          <CardTitle>총 페이지뷰</CardTitle>
          <CardValue>{summaryData.totalPageViews.toLocaleString()}</CardValue>
          <CardTrend positive={true}>
            <span style={{ marginRight: '4px' }}>↑</span> 8.3% 증가
          </CardTrend>
        </Card>
        
        <Card>
          <CardTitle>평균 체류시간</CardTitle>
          <CardValue>{summaryData.avgTimeOnSite}</CardValue>
          <CardTrend positive={true}>
            <span style={{ marginRight: '4px' }}>↑</span> 5.2% 증가
          </CardTrend>
        </Card>
        
        <Card>
          <CardTitle>이탈률</CardTitle>
          <CardValue>{summaryData.bounceRate}</CardValue>
          <CardTrend positive={false}>
            <span style={{ marginRight: '4px' }}>↑</span> 2.1% 증가
          </CardTrend>
        </Card>
        
        <Card>
          <CardTitle>신규 사용자</CardTitle>
          <CardValue>{summaryData.newUsers.toLocaleString()}</CardValue>
          <CardTrend positive={true}>
            <span style={{ marginRight: '4px' }}>↑</span> 15.8% 증가
          </CardTrend>
        </Card>
        
        <Card>
          <CardTitle>재방문 사용자</CardTitle>
          <CardValue>{summaryData.returningUsers.toLocaleString()}</CardValue>
          <CardTrend positive={true}>
            <span style={{ marginRight: '4px' }}>↑</span> 7.4% 증가
          </CardTrend>
        </Card>
        
        <FullWidthSection>
          <VisitorChart />
        </FullWidthSection>
        
        <FullWidthSection>
          <PageViewsTable />
        </FullWidthSection>
      </DashboardGrid>
    </DashboardLayout>
  );
};

export default Dashboard;