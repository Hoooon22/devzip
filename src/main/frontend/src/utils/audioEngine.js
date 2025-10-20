/**
 * Web Audio API를 사용한 사운드 엔진
 *
 * 이 클래스는 WebSocket과 완전히 독립적으로 작동하며,
 * 로컬 타이밍에 따라 사운드를 재생합니다.
 */
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.initialized = false;

        // 음계 주파수 (C4 = 261.63Hz부터)
        this.frequencies = [
            523.25, // C5
            493.88, // B4
            440.00, // A4
            392.00, // G4
            349.23, // F4
            329.63, // E4
            293.66, // D4
            261.63  // C4
        ];
    }

    /**
     * AudioContext 초기화
     *
     * 브라우저 정책상 사용자 상호작용 후에만 초기화 가능
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // AudioContext 생성 (브라우저 호환성 처리)
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();

            // AudioContext가 suspended 상태면 resume
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.initialized = true;
            console.log('✅ Audio Engine initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Audio Engine:', error);
        }
    }

    /**
     * 특정 음계의 사운드 재생
     *
     * @param {number} noteIndex - 음계 인덱스 (0-7)
     * @param {number} duration - 재생 시간 (초)
     */
    playNote(noteIndex, duration = 0.15) {
        if (!this.initialized || !this.audioContext) {
            console.warn('⚠️ Audio Engine not initialized');
            return;
        }

        const frequency = this.frequencies[noteIndex];
        const currentTime = this.audioContext.currentTime;

        // Oscillator (음파 생성기) 생성
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sine'; // 부드러운 사인파 사운드
        oscillator.frequency.value = frequency;

        // Gain (볼륨) 노드 생성
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.3, currentTime); // 초기 볼륨
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration); // 페이드아웃

        // 연결: Oscillator -> Gain -> Destination (스피커)
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // 재생 시작 및 종료 스케줄링
        oscillator.start(currentTime);
        oscillator.stop(currentTime + duration);

        console.log(`🎵 Playing note: ${noteIndex} (${frequency.toFixed(2)}Hz)`);
    }

    /**
     * 여러 음계 동시 재생 (화음)
     *
     * @param {number[]} noteIndices - 음계 인덱스 배열
     * @param {number} duration - 재생 시간 (초)
     */
    playChord(noteIndices, duration = 0.15) {
        noteIndices.forEach(noteIndex => {
            this.playNote(noteIndex, duration);
        });
    }

    /**
     * 초기화 상태 확인
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * AudioContext 종료
     */
    async shutdown() {
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
            this.initialized = false;
            console.log('👋 Audio Engine shut down');
        }
    }
}

// 싱글톤 인스턴스
const audioEngine = new AudioEngine();
export default audioEngine;
