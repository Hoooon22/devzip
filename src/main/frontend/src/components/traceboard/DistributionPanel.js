import React, { useMemo } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const PanelGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 24px;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Card = styled.div`
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 20px;

  @media (min-width: 768px) {
    padding: 24px;
  }
`;

const WideCard = styled(Card)`
  @media (min-width: 1024px) {
    grid-column: 1 / -1;
  }
`;

const Title = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin-top: 0;
  margin-bottom: 16px;
`;

const Empty = styled.div`
  text-align: center;
  padding: 32px 0;
  color: #94a3b8;
  font-size: 14px;
`;

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#94a3b8'];

// 이벤트 유형 정규화 키 → 한국어 라벨 (백엔드는 소문자/언더스코어 제거 형태로 집계)
const EVENT_TYPE_LABELS = {
  pageview: '페이지 뷰',
  click: '클릭',
  scroll: '스크롤',
  formsubmit: '폼 제출'
};

// { key: count } 형태의 객체를 [{ name, value }] 배열로 변환 (값 내림차순)
const toSortedEntries = (obj, labelMap) => {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj)
    .filter(([, value]) => typeof value === 'number')
    .map(([key, value]) => ({
      name: (labelMap && labelMap[key]) || key,
      value
    }))
    .sort((a, b) => b.value - a.value);
};

// 시간대 분포("0시"~"23시")를 0~23시 순서로 정렬한 배열로 변환
const toHourlySeries = (hourly) => {
  if (!hourly || typeof hourly !== 'object') return [];
  return Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}시`,
    count: hourly[`${hour}시`] || 0
  }));
};

const CategoryPie = ({ data }) => {
  if (!data.length) {
    return <Empty>데이터가 없습니다.</Empty>;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={(entry) => `${entry.name} (${entry.value})`}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

CategoryPie.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.number
    })
  ).isRequired
};

const DistributionPanel = ({ distributions }) => {
  const eventTypeData = useMemo(
    () => toSortedEntries(distributions.eventType, EVENT_TYPE_LABELS),
    [distributions.eventType]
  );
  const browserData = useMemo(
    () => toSortedEntries(distributions.browser),
    [distributions.browser]
  );
  const osData = useMemo(
    () => toSortedEntries(distributions.os),
    [distributions.os]
  );
  const hourlyData = useMemo(
    () => toHourlySeries(distributions.hourly),
    [distributions.hourly]
  );

  const hasHourly = hourlyData.some((d) => d.count > 0);

  return (
    <PanelGrid>
      <WideCard>
        <Title>시간대별 이벤트 분포</Title>
        {hasHourly ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" interval={1} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="이벤트 수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty>데이터가 없습니다.</Empty>
        )}
      </WideCard>

      <Card>
        <Title>이벤트 유형 분포</Title>
        <CategoryPie data={eventTypeData} />
      </Card>

      <Card>
        <Title>브라우저 분포</Title>
        <CategoryPie data={browserData} />
      </Card>

      <Card>
        <Title>운영체제 분포</Title>
        <CategoryPie data={osData} />
      </Card>
    </PanelGrid>
  );
};

DistributionPanel.propTypes = {
  distributions: PropTypes.shape({
    eventType: PropTypes.object,
    device: PropTypes.object,
    browser: PropTypes.object,
    os: PropTypes.object,
    hourly: PropTypes.object
  })
};

DistributionPanel.defaultProps = {
  distributions: {}
};

export default DistributionPanel;
