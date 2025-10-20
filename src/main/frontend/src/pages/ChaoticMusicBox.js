import React, { useState } from 'react';
import styled from 'styled-components';
import MusicGrid from '../components/musicbox/MusicGrid';
import PlaybackBar from '../components/musicbox/PlaybackBar';

/**
 * 카오틱 뮤직박스 메인 페이지
 *
 * MusicGrid와 PlaybackBar를 통합하여
 * 실시간 협업 뮤직 시퀀서를 제공합니다.
 */
const ChaoticMusicBox = () => {
    // MusicGrid에서 관리하는 grid 상태를 PlaybackBar에 전달하기 위한 상태
    const [gridState, setGridState] = useState(
        Array(8).fill(null).map(() => Array(16).fill(false))
    );

    return (
        <PageContainer>
            <Hero>
                <HeroTitle>🎵 카오틱 뮤직박스</HeroTitle>
                <HeroSubtitle>
                    실시간 협업 음악 시퀀서
                </HeroSubtitle>
                <HeroDescription>
                    여러 사용자가 함께 음악을 만들어보세요! 셀을 클릭해 노트를 추가하면
                    모든 사용자에게 즉시 동기화됩니다.
                    재생 버튼을 눌러 함께 만든 음악을 들어보세요.
                </HeroDescription>
            </Hero>

            <MainContent>
                {/* 그리드 컴포넌트 */}
                <MusicGridWrapper>
                    <MusicGrid onGridChange={setGridState} />
                </MusicGridWrapper>

                {/* 재생 컨트롤 */}
                <PlaybackBarWrapper>
                    <PlaybackBar grid={gridState} gridWidth={16} />
                </PlaybackBarWrapper>

                {/* 사용 가이드 */}
                <GuideSection>
                    <GuideTitle>📖 사용 방법</GuideTitle>
                    <GuideList>
                        <GuideItem>
                            <strong>1. 노트 추가:</strong> 그리드의 셀을 클릭하여 노트를 켜고 끌 수 있습니다
                        </GuideItem>
                        <GuideItem>
                            <strong>2. 실시간 동기화:</strong> 모든 변경사항이 다른 사용자들과 즉시 공유됩니다
                        </GuideItem>
                        <GuideItem>
                            <strong>3. 음악 재생:</strong> 재생 버튼을 눌러 시퀀스를 들어보세요
                        </GuideItem>
                        <GuideItem>
                            <strong>4. 템포 조절:</strong> BPM을 변경하여 재생 속도를 조절할 수 있습니다
                        </GuideItem>
                        <GuideItem>
                            <strong>5. 전체 삭제:</strong> 모든 노트를 제거하고 처음부터 다시 시작할 수 있습니다
                        </GuideItem>
                    </GuideList>
                </GuideSection>

                {/* 기술 설명 */}
                <TechSection>
                    <TechTitle>⚙️ 사용 기술</TechTitle>
                    <TechDescription>
                        이 애플리케이션은 다음 기술들을 사용하여 실시간 상태 동기화를 구현했습니다:
                    </TechDescription>
                    <TechList>
                        <TechItem>
                            <strong>WebSocket (STOMP):</strong> 양방향 통신을 통한 즉각적인 업데이트
                        </TechItem>
                        <TechItem>
                            <strong>Web Audio API:</strong> 로컬 오디오 합성 및 재생
                        </TechItem>
                        <TechItem>
                            <strong>Spring Boot:</strong> 백엔드 메시지 브로커 및 상태 저장
                        </TechItem>
                        <TechItem>
                            <strong>React:</strong> 실시간 상태 관리가 가능한 반응형 UI
                        </TechItem>
                    </TechList>
                </TechSection>
            </MainContent>
        </PageContainer>
    );
};

export default ChaoticMusicBox;

// Styled Components
const PageContainer = styled.div`
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 20px;
`;

const Hero = styled.div`
    text-align: center;
    color: white;
    margin-bottom: 40px;
`;

const HeroTitle = styled.h1`
    font-size: 3rem;
    margin-bottom: 10px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);

    @media (max-width: 768px) {
        font-size: 2rem;
    }
`;

const HeroSubtitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 300;
    margin-bottom: 20px;

    @media (max-width: 768px) {
        font-size: 1.2rem;
    }
`;

const HeroDescription = styled.p`
    font-size: 1.1rem;
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.6;
    opacity: 0.9;

    @media (max-width: 768px) {
        font-size: 1rem;
    }
`;

const MainContent = styled.div`
    max-width: 1400px;
    margin: 0 auto;
`;

const MusicGridWrapper = styled.div`
    background: white;
    border-radius: 15px;
    padding: 30px;
    margin-bottom: 30px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);

    @media (max-width: 768px) {
        padding: 15px;
    }
`;

const PlaybackBarWrapper = styled.div`
    background: white;
    border-radius: 15px;
    padding: 20px;
    margin-bottom: 30px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const GuideSection = styled.div`
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 30px;
    margin-bottom: 30px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const GuideTitle = styled.h3`
    font-size: 1.8rem;
    color: #333;
    margin-bottom: 20px;
`;

const GuideList = styled.ul`
    list-style: none;
    padding: 0;
`;

const GuideItem = styled.li`
    font-size: 1.1rem;
    color: #555;
    padding: 10px 0;
    border-bottom: 1px solid #eee;

    &:last-child {
        border-bottom: none;
    }

    strong {
        color: #667eea;
    }
`;

const TechSection = styled.div`
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 30px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const TechTitle = styled.h3`
    font-size: 1.8rem;
    color: #333;
    margin-bottom: 15px;
`;

const TechDescription = styled.p`
    font-size: 1.1rem;
    color: #555;
    margin-bottom: 20px;
`;

const TechList = styled.ul`
    list-style: none;
    padding: 0;
`;

const TechItem = styled.li`
    font-size: 1rem;
    color: #555;
    padding: 10px 0;
    border-bottom: 1px solid #eee;

    &:last-child {
        border-bottom: none;
    }

    strong {
        color: #764ba2;
    }
`;
