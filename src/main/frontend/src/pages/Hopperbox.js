import React, { useState, useEffect } from 'react';
import ThoughtInput from '../components/hopperbox/ThoughtInput';
import ThoughtMap from '../components/hopperbox/ThoughtMap';
import TopicSelector from '../components/hopperbox/TopicSelector';
import thoughtService from '../services/thoughtService';
import topicService from '../services/topicService';
import './Hopperbox.css';

const Hopperbox = () => {
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [mapData, setMapData] = useState([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(false);

  // 주제 목록 불러오기
  const fetchTopics = async () => {
    setIsLoadingTopics(true);
    try {
      const response = await topicService.getAllTopics();
      const topicsData = response.data || [];

      // 각 주제별 생각 개수 조회
      const topicsWithCount = await Promise.all(
        topicsData.map(async (topic) => {
          try {
            const mapResponse = await thoughtService.getTopicCentricMap(topic.id);
            const clusters = mapResponse.data?.clusters || [];
            const thoughtCount = clusters.reduce(
              (sum, cluster) => sum + (cluster.thoughts?.length || 0),
              0
            );
            return {
              ...topic,
              thoughtCount
            };
          } catch (error) {
            console.error(`Failed to get thought count for topic ${topic.id}:`, error);
            return {
              ...topic,
              thoughtCount: 0
            };
          }
        })
      );

      setTopics(topicsWithCount);
    } catch (error) {
      console.error('Failed to load topics:', error);
      setTopics([]);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  // 생각 맵 데이터 불러오기 (주제별 필터링)
  const fetchThoughtMap = async (topicId = null) => {
    setIsLoadingMap(true);
    try {
      if (topicId) {
        // 주제 중심 계층 구조 맵 데이터 조회 (유사도 기반)
        const response = await thoughtService.getTopicHierarchyMap(topicId);
        setMapData(response.data || null);
      } else {
        // 전체 보기 (주제 목록 표시)
        // topics 배열에 각 주제별 생각 개수를 추가
        const topicsWithCount = await Promise.all(
          topics.map(async (topic) => {
            try {
              const response = await thoughtService.getTopicCentricMap(topic.id);
              return {
                ...topic,
                thoughtCount: response.data?.thoughts?.length || 0
              };
            } catch (error) {
              console.error(`Failed to get thought count for topic ${topic.id}:`, error);
              return {
                ...topic,
                thoughtCount: 0
              };
            }
          })
        );
        setMapData(topicsWithCount);
      }
    } catch (error) {
      console.error('Failed to load thought map:', error);
      setMapData(topicId ? null : []);
    } finally {
      setIsLoadingMap(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchTopics();
    fetchThoughtMap();
  }, []);

  // 주제 선택 시 맵 데이터 다시 로드
  useEffect(() => {
    fetchThoughtMap(selectedTopicId);
  }, [selectedTopicId]);

  // 새 생각 저장
  const handleThoughtSubmit = async (content) => {
    try {
      await thoughtService.createThoughtWithTopic(content, selectedTopicId);
      // 저장 후 맵 다시 로드
      await fetchThoughtMap(selectedTopicId);
    } catch (error) {
      console.error('Failed to submit thought:', error);
      throw error;
    }
  };

  // 주제 선택
  const handleTopicSelect = (topicId) => {
    setSelectedTopicId(topicId);
  };

  // 새 주제 생성
  const handleCreateTopic = async (name, description, color, emoji) => {
    try {
      await topicService.createTopic(name, description, color, emoji);
      await fetchTopics();
    } catch (error) {
      console.error('Failed to create topic:', error);
      throw error;
    }
  };

  // 주제 삭제
  const handleDeleteTopic = async (topicId) => {
    try {
      await topicService.deleteTopic(topicId);
      if (selectedTopicId === topicId) {
        setSelectedTopicId(null);
      }
      await fetchTopics();
    } catch (error) {
      console.error('Failed to delete topic:', error);
      throw error;
    }
  };

  return (
    <div className="hopperbox-container">
      {/* 헤더 */}
      <header className="hopperbox-header">
        <div className="hopperbox-title">
          <h1>🎁 Hopperbox</h1>
          <p className="hopperbox-subtitle">
            주제를 선택하고 생각을 자유롭게 던져보세요!
          </p>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="hopperbox-main">
        {/* 주제 선택 사이드바 */}
        <TopicSelector
          topics={topics}
          selectedTopicId={selectedTopicId}
          onTopicSelect={handleTopicSelect}
          onCreateTopic={handleCreateTopic}
          onDeleteTopic={handleDeleteTopic}
        />

        {/* 생각 영역 */}
        <div className="hopperbox-content">
          {/* 입력 영역 */}
          <section className="hopperbox-input-section">
            <ThoughtInput onThoughtSubmit={handleThoughtSubmit} />
          </section>

          {/* 마인드맵 */}
          <section className="hopperbox-map-section">
            <ThoughtMap mapData={mapData} isLoading={isLoadingMap} />
          </section>
        </div>
      </div>
    </div>
  );
};

export default Hopperbox;