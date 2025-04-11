import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import * as d3 from "d3-force";
import { scaleLinear } from "d3-scale";
import "../assets/css/TrendChat.scss";
import CustomBubble from "../components/trendchat/CustomBubble";
import { useNavigate } from "react-router-dom"; // React Router v6 기준

const TrendChat = () => {
  const [keywords, setKeywords] = useState([]);
  const [timestamp, setTimestamp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // API 호출 함수 개선 (useCallback으로 메모이제이션)
  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("트렌드 데이터 가져오기 시작...");
      
      // Promise.all을 사용하여 병렬로 API 호출
      const [timestampRes, keywordsRes] = await Promise.all([
        fetch("/api/trend/timestamp", { 
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' } 
        }),
        fetch("/api/trend/keywords", { 
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' } 
        })
      ]);
      
      // 응답 확인
      if (!timestampRes.ok) {
        throw new Error(`타임스탬프 가져오기 실패: ${timestampRes.status}`);
      }
      
      if (!keywordsRes.ok) {
        throw new Error(`키워드 가져오기 실패: ${keywordsRes.status}`);
      }
      
      // 데이터 추출 및 파싱
      const ts = await timestampRes.text();
      let keywordsData;
      
      try {
        const keywordsText = await keywordsRes.text();
        console.log("원본 키워드 응답:", keywordsText);
        keywordsData = JSON.parse(keywordsText);
      } catch (e) {
        console.error("키워드 파싱 오류:", e);
        throw new Error(`키워드 데이터 파싱 실패: ${e.message}`);
      }
      
      // 데이터 검증 및 백업 데이터 사용
      if (!keywordsData || !Array.isArray(keywordsData) || keywordsData.length === 0) {
        console.warn("키워드 데이터가 비어 있거나 배열이 아닙니다. 더미 데이터를 사용합니다.");
        keywordsData = getDummyKeywords();
      }
      
      // 타임스탬프 설정
      setTimestamp(ts || new Date().toISOString());
      console.log("가져온 키워드:", keywordsData);

      // d3-scale: 상위 순위는 2000, 후순위는 500의 값을 할당 (면적값)
      const sizeScale = scaleLinear()
        .domain([0, keywordsData.length - 1])
        .range([2000, 500]);

      // 순위 기반 색상 생성 함수: golden angle 방식을 활용
      const getColorByIndex = (index) => {
        const hue = (index * 137.508) % 360;
        return `hsl(${hue}, 70%, 50%)`;
      };

      // 데이터 포맷팅
      let formattedData = keywordsData
        .filter(keyword => keyword && typeof keyword === 'string') // 유효한 키워드만 필터링
        .map((keyword, index) => ({
          name: keyword,
          x: Math.random() * 100,
          y: Math.random() * 100,
          z: sizeScale(index),
          fill: getColorByIndex(index),
          index: index
        }));

      // 데이터가 비어 있으면 더미 데이터 사용
      if (formattedData.length === 0) {
        formattedData = getDummyData();
      }

      // d3-force: 원들 간의 충돌 방지 및 위치 조정
      const simulation = d3.forceSimulation(formattedData)
        .force("x", d3.forceX(50).strength(0.05))
        .force("y", d3.forceY(50).strength(0.05))
        .force("collision", d3.forceCollide(d => Math.sqrt(d.z / Math.PI) / 2 + 10))
        .stop();

      // 시뮬레이션 실행
      for (let i = 0; i < 150; i++) simulation.tick();

      console.log("포맷된 데이터:", formattedData);
      setKeywords([...formattedData]);
    } catch (error) {
      console.error("Error fetching trends:", error);
      setError(`트렌드 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
      setKeywords(getDummyData());
    } finally {
      setLoading(false);
    }
  }, []); // 의존성 없음

  // 더미 키워드 (API 응답 실패 시 사용)
  const getDummyKeywords = () => [
    "인공지능", "블록체인", "메타버스", "빅데이터", "클라우드",
    "NFT", "IoT", "디지털 트윈", "로보틱스", "자율주행"
  ];

  // 더미 데이터 생성 함수 (차트 렌더링용 포맷)
  const getDummyData = () => [
    { name: "인공지능", x: 30, y: 30, z: 2000, fill: "#ff5722", index: 0 },
    { name: "블록체인", x: 70, y: 70, z: 1800, fill: "#2196f3", index: 1 },
    { name: "메타버스", x: 40, y: 60, z: 1600, fill: "#4caf50", index: 2 },
    { name: "빅데이터", x: 60, y: 40, z: 1400, fill: "#9c27b0", index: 3 },
    { name: "클라우드", x: 20, y: 20, z: 1200, fill: "#ff9800", index: 4 }
  ];

  useEffect(() => {
    // 초기 데이터 로딩
    fetchTrends();
    
    // 5분마다 새로고침
    const interval = setInterval(fetchTrends, 5 * 60 * 1000);
    
    // 컴포넌트 언마운트 시 인터벌 정리
    return () => clearInterval(interval);
  }, [fetchTrends]);

  // timestamp를 읽기 좋게 포맷 (예: "2025-02-11T20:54:42" 형태로 변환)
  const formattedTimestamp = useMemo(() => {
    if (!timestamp) return "로딩중...";
    
    try {
      return new Date(timestamp.replace(" ", "T")).toLocaleString();
    } catch (e) {
      console.error("날짜 포맷팅 오류:", e);
      return timestamp; // 포맷팅 실패 시 원본 반환
    }
  }, [timestamp]);

  // 버블 클릭 시 해당 키워드의 채팅방 API 호출 후 페이지 이동
  const openChatRoom = useCallback(async (keyword) => {
    if (!keyword || typeof keyword !== 'string') {
      console.error("유효하지 않은 키워드:", keyword);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`채팅방 열기 시도: ${keyword}`);
      
      const response = await fetch(`/api/chatrooms?keyword=${encodeURIComponent(keyword)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP 오류 ${response.status}: 채팅방을 가져올 수 없습니다.`);
      }
      
      const text = await response.text();
      console.log("채팅방 API 응답:", text);
      
      if (!text || text.trim() === '') {
        throw new Error("서버에서 빈 응답이 반환되었습니다.");
      }
      
      try {
        const room = JSON.parse(text);
        console.log("파싱된 채팅방 정보:", room);
        
        if (!room || !room.id) {
          throw new Error("채팅방 정보가 올바르지 않습니다.");
        }
        
        navigate(`/chat/${room.id}`);
      } catch (jsonError) {
        console.error("JSON 파싱 오류:", jsonError, "원본 텍스트:", text);
        throw new Error("채팅방 데이터 형식이 올바르지 않습니다.");
      }
    } catch (error) {
      console.error("채팅방 열기 실패:", error);
      setError(`채팅방을 열 수 없습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleRetry = useCallback(() => {
    setError(null);
    fetchTrends();
  }, [fetchTrends]);

  return (
    <div className="trendchat-container">
      <h1 className="trendchat-title">🔥 Trend Chat 🔥</h1>
      <p className="trendchat-subtitle">실시간 트렌드 키워드</p>
      <div className="trendchat-timestamp">
        최신 업데이트: {formattedTimestamp}
      </div>
      
      {error && (
        <div className="trendchat-error">
          {error}
          <button 
            onClick={handleRetry}
            className="error-retry-btn"
          >
            다시 시도
          </button>
        </div>
      )}
      
      {loading && <div className="trendchat-loading">로딩 중...</div>}
      
      <ResponsiveContainer width="100%" height={700}>
        <ScatterChart margin={{ top: 70, right: 70, bottom: 70, left: 70 }}>
          <XAxis type="number" dataKey="x" domain={[0, 100]} hide />
          <YAxis type="number" dataKey="y" domain={[0, 100]} hide />
          <ZAxis type="number" dataKey="z" range={[100, 6000]} />
          <Scatter 
            data={keywords} 
            shape={<CustomBubble onBubbleClick={openChatRoom} />}
          >
            <LabelList 
              dataKey="name" 
              position="center" 
              style={{ 
                fontSize: 14, 
                fontWeight: "bold", 
                fill: "white",
                textShadow: "0px 1px 2px rgba(0,0,0,0.8)",
                pointerEvents: "none" 
              }} 
            />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChat;
