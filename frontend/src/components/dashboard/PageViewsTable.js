import React, { useState } from 'react';
import styled from 'styled-components';

const TableContainer = styled.div`
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  overflow-x: auto;
  
  @media (min-width: 768px) {
    padding: 24px;
  }
  
  @media (min-width: 1024px) {
    padding: 30px;
  }
`;

const Title = styled.h3`
  font-size: 18px;
  margin-bottom: 20px;
  color: #333;
  
  @media (min-width: 768px) {
    font-size: 20px;
  }
  
  @media (min-width: 1024px) {
    font-size: 24px;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
`;

const Th = styled.th`
  text-align: left;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-bottom: 2px solid #e9ecef;
  color: #495057;
  font-weight: 600;
  position: sticky;
  top: 0;
  
  @media (min-width: 768px) {
    padding: 16px 20px;
  }
`;

const Td = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  color: #495057;
  
  @media (min-width: 768px) {
    padding: 16px 20px;
  }
`;

const Tr = styled.tr`
  &:hover {
    background-color: #f8f9fa;
  }
`;

const PageViewBar = styled.div`
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
`;

const PageViewProgress = styled.div`
  height: 100%;
  background-color: #4a6cf7;
  width: ${props => props.percentage}%;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
  gap: 8px;
`;

const PageButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid ${props => props.active ? '#4a6cf7' : '#dee2e6'};
  background-color: ${props => props.active ? '#4a6cf7' : '#fff'};
  color: ${props => props.active ? '#fff' : '#495057'};
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? '#3a56d4' : '#f8f9fa'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageViewsTable = ({ data = [], loading = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // 예시 데이터
  const mockData = [
    { path: '/home', pageViews: 1250, visitors: 850, avgTimeOnPage: '2m 30s', bounceRate: '35%' },
    { path: '/products', pageViews: 980, visitors: 620, avgTimeOnPage: '3m 15s', bounceRate: '28%' },
    { path: '/blog', pageViews: 750, visitors: 520, avgTimeOnPage: '4m 45s', bounceRate: '22%' },
    { path: '/contact', pageViews: 420, visitors: 380, avgTimeOnPage: '1m 50s', bounceRate: '45%' },
    { path: '/about', pageViews: 380, visitors: 320, avgTimeOnPage: '2m 10s', bounceRate: '30%' },
    { path: '/services', pageViews: 350, visitors: 290, avgTimeOnPage: '2m 45s', bounceRate: '32%' },
    { path: '/faq', pageViews: 320, visitors: 280, avgTimeOnPage: '3m 20s', bounceRate: '25%' },
    { path: '/login', pageViews: 290, visitors: 250, avgTimeOnPage: '1m 15s', bounceRate: '48%' },
    { path: '/signup', pageViews: 280, visitors: 240, avgTimeOnPage: '2m 05s', bounceRate: '42%' },
    { path: '/profile', pageViews: 250, visitors: 180, avgTimeOnPage: '4m 30s', bounceRate: '20%' },
    { path: '/checkout', pageViews: 220, visitors: 140, avgTimeOnPage: '3m 40s', bounceRate: '15%' },
    { path: '/cart', pageViews: 210, visitors: 150, avgTimeOnPage: '2m 20s', bounceRate: '18%' },
  ];
  
  const pageData = mockData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(mockData.length / itemsPerPage);
  
  // 최대 페이지뷰를 기준으로 백분율 계산
  const maxPageViews = Math.max(...mockData.map(item => item.pageViews));
  
  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <PageButton
          key={i}
          active={currentPage === i}
          onClick={() => setCurrentPage(i)}
          aria-label={`페이지 ${i}로 이동`}
        >
          {i}
        </PageButton>
      );
    }
    return pages;
  };

  return (
    <TableContainer>
      <Title>페이지별 조회수</Title>
      
      <Table>
        <thead>
          <tr>
            <Th>페이지</Th>
            <Th>조회수</Th>
            <Th>방문자</Th>
            <Th>평균 체류시간</Th>
            <Th>이탈률</Th>
          </tr>
        </thead>
        <tbody>
          {pageData.map((item, index) => (
            <Tr key={index}>
              <Td>{item.path}</Td>
              <Td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>{item.pageViews}</span>
                  <PageViewBar>
                    <PageViewProgress percentage={(item.pageViews / maxPageViews) * 100} />
                  </PageViewBar>
                </div>
              </Td>
              <Td>{item.visitors}</Td>
              <Td>{item.avgTimeOnPage}</Td>
              <Td>{item.bounceRate}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      
      <Pagination>
        <PageButton 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          aria-label="이전 페이지"
        >
          &lt;
        </PageButton>
        
        {renderPagination()}
        
        <PageButton 
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          aria-label="다음 페이지"
        >
          &gt;
        </PageButton>
      </Pagination>
    </TableContainer>
  );
};

export default PageViewsTable;