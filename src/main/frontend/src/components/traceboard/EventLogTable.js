import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const TableContainer = styled.div`
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-top: 24px;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  color: #64748b;
  font-weight: 600;
  font-size: 14px;
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: #f8fafc;
  }
  
  &:hover {
    background-color: #f1f5f9;
  }
`;

const TableCell = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  color: #334155;
  font-size: 14px;
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
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
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-size: 14px;
  background-color: white;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
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
  background-color: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#334155'};
  border: 1px solid ${props => props.active ? '#3b82f6' : '#cbd5e1'};
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    background-color: ${props => props.active ? '#2563eb' : '#f1f5f9'};
  }
`;

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
            {currentLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.id}</TableCell>
                <TableCell>{formatDate(log.timestamp)}</TableCell>
                <TableCell>
                  {log.eventType === 'pageView' ? '페이지 뷰' : 
                   log.eventType === 'click' ? '클릭' : 
                   log.eventType === 'scroll' ? '스크롤' : 
                   log.eventType === 'formSubmit' ? '폼 제출' : log.eventType}
                </TableCell>
                <TableCell>{log.path}</TableCell>
                <TableCell>{log.userId}</TableCell>
                <TableCell>
                  {log.deviceType === 'mobile' ? '모바일' : 
                   log.deviceType === 'tablet' ? '태블릿' : 
                   log.deviceType === 'desktop' ? '데스크톱' : log.deviceType}
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