import React, { useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ChartContainer = styled.div`
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 24px;
  
  @media (min-width: 768px) {
    padding: 24px;
  }
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin-top: 0;
  margin-bottom: 16px;
  
  @media (min-width: 768px) {
    font-size: 20px;
  }
`;

const ControlBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
`;

const TimeRangeSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TimeButton = styled.button`
  background-color: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#334155'};
  border: 1px solid ${props => props.active ? '#3b82f6' : '#cbd5e1'};
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? '#2563eb' : '#f1f5f9'};
  }
`;

const ChartTypeSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChartTypeButton = styled.button`
  background-color: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#334155'};
  border: 1px solid ${props => props.active ? '#3b82f6' : '#cbd5e1'};
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? '#2563eb' : '#f1f5f9'};
  }
`;

const NoDataMessage = styled.div`
  text-align: center;
  padding: 40px 0;
  color: #64748b;
  font-size: 16px;
`;

// 시간에 따른 필터링
const filterLogsByTimeRange = (logs, range) => {
  if (!logs || !Array.isArray(logs)) return [];
  
  const now = new Date();
  let cutoffDate;
  
  switch (range) {
    case 'day':
      cutoffDate = new Date(now.setDate(now.getDate() - 1));
      break;
    case 'week':
      cutoffDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    default:
      cutoffDate = new Date(0); // 모든 이벤트
  }
  
  // logs 배열의 유효성 확인 후 filter 적용
  return logs.filter(log => {
    if (!log || !log.timestamp) return false;
    
    // timestamp가 문자열이면 Date 객체로 변환
    const logDate = typeof log.timestamp === 'string' 
      ? new Date(log.timestamp) 
      : log.timestamp;
      
    return logDate >= cutoffDate;
  });
};

// 날짜 형식화 (안전하게 처리)
const formatDate = (dateString) => {
  if (!dateString) return 'Invalid Date';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch (e) {
    console.error('날짜 형식화 오류:', e);
    return 'Invalid Date';
  }
};

// 시간 형식화 (안전하게 처리)
const formatTime = (dateString) => {
  if (!dateString) return 'Invalid Time';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Time';
    return `${date.getHours()}:00`;
  } catch (e) {
    console.error('시간 형식화 오류:', e);
    return 'Invalid Time';
  }
};

// 툴팁 커스터마이징
const CustomTooltip = ({ active, payload, label, chartType }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '8px', 
        border: '1px solid #e2e8f0',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: '2px 0', color: entry.color }}>
            {chartType === 'eventType' 
              ? entry.name === 'pageView' ? '페이지 뷰' 
                : entry.name === 'click' ? '클릭' 
                : entry.name === 'scroll' ? '스크롤' 
                : entry.name === 'formSubmit' ? '폼 제출' 
                : entry.name
              : entry.name === 'mobile' ? '모바일'
                : entry.name === 'tablet' ? '태블릿'
                : entry.name === 'desktop' ? '데스크톱'
                : entry.name
            }: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number,
      color: PropTypes.string
    })
  ),
  label: PropTypes.string,
  chartType: PropTypes.string
};

const UserBehaviorChart = ({ eventLogs = [] }) => {
  const [timeRange, setTimeRange] = useState('week');
  const [chartType, setChartType] = useState('eventType');
  
  // 디버깅: 컴포넌트에 전달된 데이터 확인
  useEffect(() => {
    console.log('UserBehaviorChart에 전달된 데이터:', { 
      logsCount: eventLogs?.length || 0, 
      sample: eventLogs?.[0] || 'No data' 
    });
  }, [eventLogs]);
  
  // 시간 범위에 따라 필터링된 로그
  const filteredLogs = useMemo(() => {
    console.log('필터링 전 이벤트 로그 수:', eventLogs?.length || 0);
    const filtered = filterLogsByTimeRange(eventLogs, timeRange);
    console.log('필터링 후 이벤트 로그 수:', filtered.length);
    return filtered;
  }, [eventLogs, timeRange]);
  
  // 차트 데이터 생성
  const chartData = useMemo(() => {
    if (!filteredLogs.length) {
      console.log('필터링된 로그가 없어 빈 차트 데이터 반환');
      return [];
    }
    
    if (chartType === 'eventType') {
      // 이벤트 유형별 집계
      console.log('이벤트 유형별 집계 시작');
      const eventsByType = filteredLogs.reduce((acc, log) => {
        if (!log || !log.timestamp || !log.eventType) return acc;
        
        const date = timeRange === 'day' 
          ? formatTime(log.timestamp) 
          : formatDate(log.timestamp);
        
        if (date === 'Invalid Date' || date === 'Invalid Time') return acc;
        
        if (!acc[date]) {
          acc[date] = {
            date,
            pageView: 0,
            click: 0,
            scroll: 0,
            formSubmit: 0
          };
        }
        
        acc[date][log.eventType] = (acc[date][log.eventType] || 0) + 1;
        return acc;
      }, {});
      
      const result = Object.values(eventsByType);
      console.log('이벤트 유형별 집계 결과:', result.length, '개 날짜');
      return result;
    } else {
      // 디바이스 유형별 집계
      console.log('디바이스 유형별 집계 시작');
      const eventsByDevice = filteredLogs.reduce((acc, log) => {
        if (!log || !log.timestamp || !log.deviceType) return acc;
        
        const date = timeRange === 'day' 
          ? formatTime(log.timestamp) 
          : formatDate(log.timestamp);
        
        if (date === 'Invalid Date' || date === 'Invalid Time') return acc;
        
        if (!acc[date]) {
          acc[date] = {
            date,
            mobile: 0,
            tablet: 0,
            desktop: 0
          };
        }
        
        acc[date][log.deviceType] = (acc[date][log.deviceType] || 0) + 1;
        return acc;
      }, {});
      
      const result = Object.values(eventsByDevice);
      console.log('디바이스 유형별 집계 결과:', result.length, '개 날짜');
      return result;
    }
  }, [filteredLogs, chartType, timeRange]);
  
  // 데이터가 없는 경우 메시지 표시
  if (!eventLogs || !Array.isArray(eventLogs) || eventLogs.length === 0) {
    return (
      <ChartContainer>
        <Title>사용자 행동 분석</Title>
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <p>표시할 데이터가 없습니다.</p>
        </div>
      </ChartContainer>
    );
  }
  
  return (
    <ChartContainer>
      <Title>사용자 행동 분석</Title>
      
      <ControlBar>
        <TimeRangeSelector>
          <TimeButton 
            active={timeRange === 'day'} 
            onClick={() => setTimeRange('day')}
          >
            24시간
          </TimeButton>
          <TimeButton 
            active={timeRange === 'week'} 
            onClick={() => setTimeRange('week')}
          >
            일주일
          </TimeButton>
          <TimeButton 
            active={timeRange === 'month'} 
            onClick={() => setTimeRange('month')}
          >
            한 달
          </TimeButton>
        </TimeRangeSelector>
        
        <ChartTypeSelector>
          <ChartTypeButton 
            active={chartType === 'eventType'} 
            onClick={() => setChartType('eventType')}
          >
            이벤트 유형
          </ChartTypeButton>
          <ChartTypeButton 
            active={chartType === 'deviceType'} 
            onClick={() => setChartType('deviceType')}
          >
            디바이스 유형
          </ChartTypeButton>
        </ChartTypeSelector>
      </ControlBar>
      
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              angle={-45} 
              textAnchor="end" 
              height={60} 
              tickMargin={15}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip chartType={chartType} />} />
            <Legend />
            
            {chartType === 'eventType' ? (
              <>
                <Bar dataKey="pageView" name="페이지 뷰" fill="#3b82f6" />
                <Bar dataKey="click" name="클릭" fill="#10b981" />
                <Bar dataKey="scroll" name="스크롤" fill="#f59e0b" />
                <Bar dataKey="formSubmit" name="폼 제출" fill="#8b5cf6" />
              </>
            ) : (
              <>
                <Bar dataKey="mobile" name="모바일" fill="#3b82f6" />
                <Bar dataKey="tablet" name="태블릿" fill="#10b981" />
                <Bar dataKey="desktop" name="데스크톱" fill="#f59e0b" />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <NoDataMessage>해당 기간에 데이터가 없습니다.</NoDataMessage>
      )}
    </ChartContainer>
  );
};

UserBehaviorChart.propTypes = {
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

export default UserBehaviorChart; 