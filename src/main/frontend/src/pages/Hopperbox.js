import React, { useState, useEffect } from 'react';
import ThoughtInput from '../components/hopperbox/ThoughtInput';
import ThoughtList from '../components/hopperbox/ThoughtList';
import ThoughtMap from '../components/hopperbox/ThoughtMap';
import thoughtService from '../services/thoughtService';
import './Hopperbox.css';

const Hopperbox = () => {
  const [thoughts, setThoughts] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [isLoadingThoughts, setIsLoadingThoughts] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [activeView, setActiveView] = useState('list'); // 'list' or 'map'

  // 생각 목록 불러오기
  const fetchThoughts = async () => {
    setIsLoadingThoughts(true);
    try {
      const response = await thoughtService.getAllThoughts();
      // ApiResponse 구조에서 데이터 추출
      setThoughts(response.data || []);
    } catch (error) {
      console.error('Failed to load thoughts:', error);
      setThoughts([]);
    } finally {
      setIsLoadingThoughts(false);
    }
  };

  // 생각 맵 데이터 불러오기
  const fetchThoughtMap = async () => {
    setIsLoadingMap(true);
    try {
      const response = await thoughtService.getThoughtMap();
      // ApiResponse 구조에서 데이터 추출
      setMapData(response.data || []);
    } catch (error) {
      console.error('Failed to load thought map:', error);
      setMapData([]);
    } finally {
      setIsLoadingMap(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchThoughts();
    fetchThoughtMap();
  }, []);

  // 새 생각 저장
  const handleThoughtSubmit = async (content) => {
    try {
      await thoughtService.createThought(content);
      // 저장 후 목록과 맵 다시 로드
      await Promise.all([fetchThoughts(), fetchThoughtMap()]);
    } catch (error) {
      console.error('Failed to submit thought:', error);
      throw error;
    }
  };

  // 뷰 전환
  const handleViewChange = (view) => {
    setActiveView(view);
  };

  return (
    <div className="hopperbox-container">
      {/* 헤더 */}
      <header className="hopperbox-header">
        <div className="hopperbox-title">
          <h1>🎁 Hopperbox</h1>
          <p className="hopperbox-subtitle">
            생각한 무언가를 일단 넣어보세요!
          </p>
        </div>

        {/* 뷰 전환 버튼 */}
        <div className="hopperbox-view-toggle">
          <button
            className={`view-toggle-btn ${activeView === 'list' ? 'active' : ''}`}
            onClick={() => handleViewChange('list')}
          >
            📋 목록
          </button>
          <button
            className={`view-toggle-btn ${activeView === 'map' ? 'active' : ''}`}
            onClick={() => handleViewChange('map')}
          >
            🗺️ 지도
          </button>
        </div>
      </header>

      {/* 입력 영역 */}
      <section className="hopperbox-input-section">
        <ThoughtInput onThoughtSubmit={handleThoughtSubmit} />
      </section>

      {/* 컨텐츠 영역 */}
      <section className="hopperbox-content-section">
        {activeView === 'list' ? (
          <ThoughtList thoughts={thoughts} isLoading={isLoadingThoughts} />
        ) : (
          <ThoughtMap mapData={mapData} isLoading={isLoadingMap} />
        )}
      </section>
    </div>
  );
};

export default Hopperbox;