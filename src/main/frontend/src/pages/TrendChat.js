import React, { useEffect, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import * as d3 from "d3-force"; // d3-force를 이용한 위치 조정

const TrendChat = () => {
  const [keywords, setKeywords] = useState([]);

  const fetchTrends = async () => {
    try {
      const timestampRes = await fetch("/api/trend/timestamp");
      const keywordsRes = await fetch("/api/trend/keywords");
      const timestamp = await timestampRes.text();
      const keywordsData = await keywordsRes.json();

      let formattedData = keywordsData.map((keyword, index) => ({
        name: keyword,
        x: Math.random() * 100,  // 초기 랜덤 위치 (d3-force로 조정될 예정)
        y: Math.random() * 100,
        z: 400 - index * 20,  // 크기 조정 (최대 400, 최소 20)
      }));

      // D3 Force Simulation을 사용하여 원이 겹치지 않게 배치
      const simulation = d3.forceSimulation(formattedData)
        .force("x", d3.forceX(50).strength(0.05))
        .force("y", d3.forceY(50).strength(0.05))
        .force("collision", d3.forceCollide(d => d.z / 2 + 5)) // 원 크기 반영하여 충돌 방지
        .stop();

      for (let i = 0; i < 100; i++) simulation.tick(); // 충분한 반복으로 충돌 해결

      setKeywords([...formattedData]); // 새로운 위치 반영
    } catch (error) {
      console.error("Error fetching trends:", error);
    }
  };

  useEffect(() => {
    fetchTrends();
    const interval = setInterval(fetchTrends, 10 * 60 * 1000); // 10분마다 갱신
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-4">🔥 Trend Chat 🔥</h1>
      <p className="text-gray-600 mb-6 text-lg">실시간 트렌드 키워드</p>
      <ResponsiveContainer width="100%" height={600}>
        <ScatterChart>
          <XAxis type="number" dataKey="x" domain={[0, 100]} hide />
          <YAxis type="number" dataKey="y" domain={[0, 100]} hide />
          <ZAxis type="number" dataKey="z" range={[100, 500]} /> {/* 크기 확대 */}
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter name="Trends" data={keywords} fill="#82ca9d">
            <LabelList dataKey="name" position="center" style={{ fontSize: 18, fontWeight: "bold", fill: "white" }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChat;