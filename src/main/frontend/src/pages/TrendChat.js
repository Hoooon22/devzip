import React, { useEffect, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import * as d3 from "d3-force";
import { scaleLinear } from "d3-scale";
import "../assets/css/TrendChat.scss";
import CustomBubble from "../components/trendchat/CustomBubble";

const TrendChat = () => {
    const [keywords, setKeywords] = useState([]);
    const [timestamp, setTimestamp] = useState(null);
  
    const fetchTrends = async () => {
      try {
        const timestampRes = await fetch("/api/trend/timestamp");
        const keywordsRes = await fetch("/api/trend/keywords");
        const ts = await timestampRes.text();
        const keywordsData = await keywordsRes.json();
        
        setTimestamp(ts);
  
        // d3-scale: 상위 순위는 1600, 후순위는 400의 값을 할당 (면적값)
        const sizeScale = scaleLinear()
          .domain([0, keywordsData.length - 1])
          .range([1600, 400]);
  
        // 순위 기반 색상 생성 함수: golden angle 방식을 활용
        const getColorByIndex = (index) => {
          const hue = (index * 137.508) % 360;
          return `hsl(${hue}, 70%, 50%)`;
        };
  
        let formattedData = keywordsData.map((keyword, index) => ({
          name: keyword,
          x: Math.random() * 100,
          y: Math.random() * 100,
          z: sizeScale(index),
          fill: getColorByIndex(index)
        }));
  
        // d3-force: 원들 간의 충돌 방지 및 위치 조정
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
  
    // timestamp를 읽기 좋게 포맷 (예: "2025-02-11T20:54:42" 형태로 변환)
    const formattedTimestamp = timestamp
      ? new Date(timestamp.replace(" ", "T")).toLocaleString()
      : "로딩중...";
  
    return (
      <div className="trendchat-container">
        <h1 className="trendchat-title">🔥 Trend Chat 🔥</h1>
        <p className="trendchat-subtitle">실시간 트렌드 키워드</p>
        <div className="trendchat-timestamp">
          최신 업데이트: {formattedTimestamp}
        </div>
        <ResponsiveContainer width="100%" height={700}>
          <ScatterChart margin={{ top: 70, right: 70, bottom: 70, left: 70 }}>
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.5)" />
              </filter>
            </defs>
            <XAxis type="number" dataKey="x" domain={[0, 100]} hide />
            <YAxis type="number" dataKey="y" domain={[0, 100]} hide />
            <ZAxis type="number" dataKey="z" range={[50, 8000]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter name="Trends" data={keywords} shape={<CustomBubble />}>
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