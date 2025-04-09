import React, { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import styled from 'styled-components';

const ChartContainer = styled.div`
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
  
  @media (min-width: 768px) {
    padding: 24px;
  }
  
  @media (min-width: 1024px) {
    padding: 30px;
  }
`;

const ChartTitle = styled.h3`
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

const FilterContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  
  @media (min-width: 768px) {
    gap: 15px;
  }
`;

const FilterButton = styled.button`
  background-color: ${props => props.active ? '#4a6cf7' : '#f0f2f5'};
  color: ${props => props.active ? 'white' : '#333'};
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
  min-width: 44px;
  
  &:hover {
    background-color: ${props => props.active ? '#3a56d4' : '#e0e0e0'};
  }
  
  @media (min-width: 768px) {
    padding: 10px 16px;
    font-size: 15px;
  }
`;

const VisitorChart = ({ data = [], loading = false }) => {
  const [filter, setFilter] = useState('day');
  const [chartData, setChartData] = useState([]);
  
  useEffect(() => {
    // 실제 구현에서는 API에서 데이터를 받아옵니다
    // 여기서는 예시 데이터를 사용합니다
    const mockData = [
      { date: '2023-04-01', visitors: 120, pageViews: 350 },
      { date: '2023-04-02', visitors: 150, pageViews: 420 },
      { date: '2023-04-03', visitors: 180, pageViews: 510 },
      { date: '2023-04-04', visitors: 210, pageViews: 590 },
      { date: '2023-04-05', visitors: 190, pageViews: 540 },
      { date: '2023-04-06', visitors: 220, pageViews: 620 },
      { date: '2023-04-07', visitors: 250, pageViews: 700 },
    ];
    
    setChartData(mockData);
  }, [filter]);

  return (
    <ChartContainer>
      <ChartTitle>방문자 통계</ChartTitle>
      
      <FilterContainer>
        <FilterButton 
          active={filter === 'day'} 
          onClick={() => setFilter('day')}
          aria-label="일별 데이터 보기"
        >
          일별
        </FilterButton>
        <FilterButton 
          active={filter === 'week'} 
          onClick={() => setFilter('week')}
          aria-label="주별 데이터 보기"
        >
          주별
        </FilterButton>
        <FilterButton 
          active={filter === 'month'} 
          onClick={() => setFilter('month')}
          aria-label="월별 데이터 보기"
        >
          월별
        </FilterButton>
      </FilterContainer>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 20,
            left: 10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="visitors"
            stroke="#4a6cf7"
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="pageViews" 
            stroke="#f53d3d" 
            strokeWidth={2} 
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default VisitorChart;