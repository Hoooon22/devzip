import React, { useEffect, useState } from "react";
import { BubbleChart, Bubble } from "recharts";

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
        value: 100 - index * 5, // 순위가 높을수록 큰 크기로 설정
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
      <BubbleChart width={600} height={400}>
        {keywords.map((keyword, index) => (
          <Bubble key={index} cx={Math.random() * 600} cy={Math.random() * 400} r={keyword.value} fill="#82ca9d">
            <title>{keyword.name}</title>
          </Bubble>
        ))}
      </BubbleChart>
    </div>
  );
};

export default TrendChat;
