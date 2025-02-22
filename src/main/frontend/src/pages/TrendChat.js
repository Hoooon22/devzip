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
        .range([3600, 400]);

      let formattedData = keywordsData.map((keyword, index) => ({
        name: keyword,
        x: Math.random() * 100,  // 초기 랜덤 위치
        y: Math.random() * 100,
        z: sizeScale(index),
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
      <ResponsiveContainer width="100%" height={600}>
        <ScatterChart>
          <XAxis type="number" dataKey="x" domain={[0, 100]} hide />
          <YAxis type="number" dataKey="y" domain={[0, 100]} hide />
          {/* ZAxis의 range를 내부 z 값의 범위에 맞게 조정 */}
          <ZAxis type="number" dataKey="z" range={[200, 800]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter name="Trends" data={keywords} fill="#82ca9d">
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
