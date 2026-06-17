import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import Badge from '../Badge';

const TableContainer = styled.div`
  background: rgba(255, 255, 255, 0.97);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
  margin-top: 8px;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 14px 16px;
  border-bottom: 2px solid #ede9fe;
  background-color: #f5f3ff;
  color: #5a4bb5;
  font-weight: 700;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: #faf9ff;
  }

  &:hover {
    background-color: #f1ecff;
  }
`;

const TableCell = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid #eef0f4;
  color: #334155;
  font-size: 14px;
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  margin-bottom: 16px;

  @media (min-width: 768px) {
    font-size: 20px;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: #334155;
  font-size: 14px;
  font-weight: 500;
  background-color: rgba(255, 255, 255, 0.95);
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 16px;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 14px;
`;

const PaginationButton = styled.button`
  background-color: ${props => props.active ? '#667eea' : 'white'};
  color: ${props => props.active ? 'white' : '#334155'};
  border: 1px solid ${props => props.active ? '#667eea' : '#cbd5e1'};
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background-color: ${props => props.active ? '#5a4bb5' : '#f1f5f9'};
  }
`;

const hashUserId = userId => {
  if (!userId || userId === 'anonymous') return 'anonymous';
  
  // IP 주소 패턴 확인 (간단한 IPv4 패턴)
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  const isIpAddress = ipv4Pattern.test(userId);
  
  // 앞 5글자만 표시하고 나머지는 * 처리
  const visiblePart = userId.substring(0, 5);
  const maskedLength = Math.min(userId.length - 5, 5); // 마스킹할 문자 개수 (최대 5개)
  
  return `${visiblePart}${'*'.repeat(maskedLength)}`;
};

const getEventTypeLabel = (eventType) => {
  let color;
  let label;
  
  switch (eventType) {
    case 'pageView':
      color = '#3b82f6'; // 파란색
      label = '페이지 뷰';
      break;
    case 'click':
      color = '#10b981'; // 초록색
      label = '클릭';
      break;
    case 'scroll':
      color = '#f59e0b'; // 주황색
      label = '스크롤';
      break;
    case 'formSubmit':
      color = '#6366f1'; // 보라색
      label = '폼 제출';
      break;
    default:
      color = '#94a3b8'; // A1# 회색
      label = eventType;
  }
  
  return <Badge bg={color}>{label}</Badge>;
};

const getDeviceTypeLabel = (deviceType) => {
  switch (deviceType) {
    case 'mobile':
      return '모바일';
    case 'tablet':
      return '태블릿';
    case 'desktop':
      return '데스크톱';
    default:
      return deviceType;
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
};

const EventLogTable = ({ eventLogs = [] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState({
    eventType: '',
    deviceType: '',
  });
  
  // 디버깅: 컴포넌트에 전달된 데이터 확인
  useEffect(() => {
    console.log('EventLogTable에 전달된 데이터:', { 
      logsCount: eventLogs?.length || 0, 
      sample: eventLogs?.[0] || 'No data' 
    });
  }, [eventLogs]);
  
  const itemsPerPage = 10;
  
  // 필터링된 이벤트 로그
  const filteredLogs = useMemo(() => {
    if (!eventLogs || !Array.isArray(eventLogs) || eventLogs.length === 0) {
      return [];
    }
    
    return eventLogs.filter(log => {
      if (!log) return false;
      return (!filter.eventType || log.eventType === filter.eventType) && 
             (!filter.deviceType || log.deviceType === filter.deviceType);
    });
  }, [eventLogs, filter.eventType, filter.deviceType]);
  
  // 현재 페이지의 이벤트 로그
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  
  // 총 페이지 수
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  
  // 고유한 이벤트 타입 및 디바이스 타입 목록
  const eventTypes = useMemo(() => {
    if (!eventLogs || !Array.isArray(eventLogs) || eventLogs.length === 0) {
      return [];
    }
    return [...new Set(eventLogs.filter(log => log && log.eventType).map(log => log.eventType))];
  }, [eventLogs]);
  
  const deviceTypes = useMemo(() => {
    if (!eventLogs || !Array.isArray(eventLogs) || eventLogs.length === 0) {
      return [];
    }
    return [...new Set(eventLogs.filter(log => log && log.deviceType).map(log => log.deviceType))];
  }, [eventLogs]);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };
  
  // 데이터가 없는 경우
  if (!eventLogs || !Array.isArray(eventLogs) || eventLogs.length === 0) {
    return (
      <div>
        <Title>이벤트 로그</Title>
        <TableContainer>
          <p style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
            표시할 이벤트 로그가 없습니다.
          </p>
        </TableContainer>
      </div>
    );
  }
  
  return (
    <div>
      <Title>이벤트 로그</Title>
      
      <FilterContainer>
        <FilterSelect 
          name="eventType" 
          value={filter.eventType} 
          onChange={handleFilterChange}
        >
          <option value="">모든 이벤트 유형</option>
          {eventTypes.map(type => (
            <option key={type} value={type}>
              {type === 'pageView' ? '페이지 뷰' : 
               type === 'click' ? '클릭' : 
               type === 'scroll' ? '스크롤' : 
               type === 'formSubmit' ? '폼 제출' : type}
            </option>
          ))}
        </FilterSelect>
        
        <FilterSelect
          name="deviceType"
          value={filter.deviceType}
          onChange={handleFilterChange}
        >
          <option value="">모든 디바이스</option>
          {deviceTypes.map(type => (
            <option key={type} value={type}>
              {type === 'mobile' ? '모바일' : 
               type === 'tablet' ? '태블릿' : 
               type === 'desktop' ? '데스크톱' : type}
            </option>
          ))}
        </FilterSelect>
      </FilterContainer>
      
      <TableContainer>
        <Table>
          <thead>
            <tr>
              <TableHeader>ID</TableHeader>
              <TableHeader>타임스탬프</TableHeader>
              <TableHeader>이벤트</TableHeader>
              <TableHeader>경로</TableHeader>
              <TableHeader>사용자 ID</TableHeader>
              <TableHeader>디바이스</TableHeader>
              <TableHeader>브라우저</TableHeader>
            </tr>
          </thead>
          <tbody>
            {currentLogs.map((log, index) => (
              <TableRow key={log.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{formatDate(log.timestamp)}</TableCell>
                <TableCell>
                  {getEventTypeLabel(log.eventType)}
                </TableCell>
                <TableCell>{log.path}</TableCell>
                <TableCell>{log.displayUserId || hashUserId(log.userId)}</TableCell>
                <TableCell>
                  {getDeviceTypeLabel(log.deviceType)}
                </TableCell>
                <TableCell>{log.browser}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
        
        {totalPages > 1 && (
          <Pagination>
            <PaginationButton 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              이전
            </PaginationButton>
            
            <span>{currentPage} / {totalPages}</span>
            
            <PaginationButton 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              다음
            </PaginationButton>
          </Pagination>
        )}
      </TableContainer>
    </div>
  );
};

EventLogTable.propTypes = {
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

export default EventLogTable; 