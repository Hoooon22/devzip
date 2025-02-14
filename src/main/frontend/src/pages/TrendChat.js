import React, { useEffect, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";

const TrendChat = () => {
  const [keywords, setKeywords] = useState([]);

  const fetchTrends = async () => {
    try {
      const timestampRes = await fetch("/api/trend/timestamp");
      const keywordsRes = await fetch("/api/trend/keywords");
      const timestamp = await timestampRes.text();
      const keywordsData = await keywordsRes.json();

      const formattedData = keywordsData.map((keyword, index) => ({
        name: keyword,       // 키워드 텍스트
        x: Math.random() * 100,  // X축 랜덤 위치
        y: Math.random() * 100,  // Y축 랜덤 위치
        z: 200 - index * 10,  // 크기 조정 (최대 200, 최소 10)
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
          <ZAxis type="number" dataKey="z" range={[50, 400]} /> {/* 크기 조절 */}
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter name="Trends" data={keywords} fill="#82ca9d">
            <LabelList dataKey="name" position="top" style={{ fontSize: 16, fontWeight: "bold", fill: "black" }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChat;
