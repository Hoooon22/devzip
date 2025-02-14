import React, { useEffect, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer } from "recharts";

const TrendChat = () => {
  const [keywords, setKeywords] = useState([]);

  const fetchTrends = async () => {
    try {
      const timestampRes = await fetch("/api/trend/timestamp");
      const keywordsRes = await fetch("/api/trend/keywords");
      const timestamp = await timestampRes.text();
      const keywordsData = await keywordsRes.json();

      const formattedData = keywordsData.map((keyword, index) => ({
        name: keyword,
        x: Math.random() * 100, // X축 랜덤 위치
        y: Math.random() * 100, // Y축 랜덤 위치
        z: 100 - index * 5, // 순위가 높을수록 원이 큼
      }));

      setKeywords(formattedData);
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
      <h1 className="text-2xl font-bold mb-4">Trend Chat</h1>
      <p className="text-gray-600 mb-6">실시간 트렌드 키워드</p>
      <ResponsiveContainer width={600} height={400}>
        <ScatterChart>
          <XAxis type="number" dataKey="x" hide />
          <YAxis type="number" dataKey="y" hide />
          <ZAxis type="number" dataKey="z" range={[20, 200]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter name="Trends" data={keywords} fill="#82ca9d">
            {keywords.map((keyword, index) => (
              <text
                key={index}
                x={keyword.x}
                y={keyword.y}
                dy={-10}
                textAnchor="middle"
                fill="black"
                fontSize="14"
              >
                {keyword.name}
              </text>
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChat;
