import React, { useEffect, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import * as d3 from "d3-force";
import { scaleLinear } from "d3-scale";

const TrendChat = () => {
  const [keywords, setKeywords] = useState([]);

  const fetchTrends = async () => {
    try {
      const timestampRes = await fetch("/api/trend/timestamp");
      const keywordsRes = await fetch("/api/trend/keywords");
      const timestamp = await timestampRes.text();
      const keywordsData = await keywordsRes.json();

      // d3-scale: 상위 순위는 1600, 후순위는 400의 값을 할당 (면적에 가까운 값)
      const sizeScale = scaleLinear()
        .domain([0, keywordsData.length - 1])
        .range([1600, 400]);

      // 순위 기반 색상 생성 함수: golden angle 방식을 활용하여 고르게 분포된 색상 생성
      const getColorByIndex = (index) => {
        const hue = (index * 137.508) % 360;
        return `hsl(${hue}, 70%, 50%)`;
      };

      let formattedData = keywordsData.map((keyword, index) => ({
        name: keyword,
        x: Math.random() * 100,  // 초기 위치 설정 랜덤
        y: Math.random() * 100,
        z: sizeScale(index),
        fill: getColorByIndex(index)  // 순위에 따른 색상 할당
      }));

      // d3-force: 원들 간의 충돌을 방지하며 위치 조정
      const simulation = d3.forceSimulation(formattedData)
        .force("x", d3.forceX(50).strength(0.05))
        .force("y", d3.forceY(50).strength(0.05))
        .force("collision", d3.forceCollide(d => d.z / 2 + 5))
        .stop();

      for (let i = 0; i < 100; i++) simulation.tick();

      setKeywords([...formattedData]);
    } catch (error) {
      console.error("Error fetching trends:", error);
    }
  };

  useEffect(() => {
    fetchTrends();
    const interval = setInterval(fetchTrends, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-4">🔥 Trend Chat 🔥</h1>
      <p className="text-gray-600 mb-6 text-lg">실시간 트렌드 키워드</p>
      <ResponsiveContainer width="100%" height={700}>
        <ScatterChart margin={{ top: 70, right: 70, bottom: 70, left: 70 }}>
          <XAxis type="number" dataKey="x" domain={[0, 100]} hide />
          <YAxis type="number" dataKey="y" domain={[0, 100]} hide />
          {/* ZAxis의 range는 내부 z 값을 화면상의 원 면적으로 매핑 */}
          <ZAxis type="number" dataKey="z" range={[2000, 16000]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          {/* Scatter 컴포넌트에서 각 데이터의 fill 속성이 사용되도록 전역 fill 속성 제거 */}
          <Scatter name="Trends" data={keywords}>
            <LabelList 
              dataKey="name" 
              position="center" 
              style={{ fontSize: 22, fontWeight: "bold", fill: "black" }} 
            />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChat;
