import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * 뮤직박스 WebSocket 클라이언트 서비스
 *
 * 이 서비스는 Spring Boot 백엔드의 WebSocket 서버와 연결하여
 * 실시간 그리드 상태 동기화를 담당합니다.
 */
class MusicBoxWebSocketService {
    constructor() {
        this.client = null;
        this.connected = false;
        this.subscriptions = [];
    }

    /**
     * WebSocket 연결 초기화
     *
     * @param {Function} onMessageReceived - 메시지 수신 시 호출될 콜백 함수
     * @param {Function} onConnected - 연결 성공 시 호출될 콜백 함수
     * @param {Function} onError - 에러 발생 시 호출될 콜백 함수
     */
    connect(onMessageReceived, onConnected, onError) {
        // SockJS를 통한 WebSocket 연결 생성
        const socket = new SockJS('/ws-livechat');

        // STOMP 클라이언트 생성
        this.client = new Client({
            webSocketFactory: () => socket,

            // 연결 성공 시
            onConnect: (frame) => {
                console.log('🎵 Music Box WebSocket Connected:', frame);
                this.connected = true;

                // /topic/musicbox/updates 구독
                const subscription = this.client.subscribe(
                    '/topic/musicbox/updates',
                    (message) => {
                        // 메시지 파싱 및 콜백 호출
                        const parsedMessage = JSON.parse(message.body);
                        console.log('📨 Message received:', parsedMessage);

                        if (onMessageReceived) {
                            onMessageReceived(parsedMessage);
                        }
                    }
                );

                this.subscriptions.push(subscription);

                if (onConnected) {
                    onConnected();
                }
            },

            // 연결 에러 시
            onStompError: (frame) => {
                console.error('❌ STOMP Error:', frame);
                this.connected = false;

                if (onError) {
                    onError(frame);
                }
            },

            // 디버깅 로그 (개발 환경에서만 활성화)
            debug: (str) => {
                if (process.env.NODE_ENV === 'development') {
                    console.log('🔍 STOMP Debug:', str);
                }
            },

            // 재연결 설정
            reconnectDelay: 5000, // 5초 후 재연결 시도
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        // 연결 시작
        this.client.activate();
    }

    /**
     * 셀 토글 메시지 전송
     *
     * @param {number} x - X 좌표
     * @param {number} y - Y 좌표
     * @param {string} username - 사용자 이름
     */
    sendToggleMessage(x, y, username = 'Anonymous') {
        if (!this.connected || !this.client) {
            console.warn('⚠️ WebSocket is not connected');
            return;
        }

        const message = {
            x,
            y,
            username,
            type: 'TOGGLE'
        };

        console.log('📤 Sending toggle message:', message);

        // /app/musicbox/toggle 엔드포인트로 메시지 전송
        this.client.publish({
            destination: '/app/musicbox/toggle',
            body: JSON.stringify(message)
        });
    }

    /**
     * 그리드 전체 클리어 메시지 전송
     *
     * @param {string} username - 사용자 이름
     */
    sendClearMessage(username = 'Anonymous') {
        if (!this.connected || !this.client) {
            console.warn('⚠️ WebSocket is not connected');
            return;
        }

        const message = {
            x: 0,
            y: 0,
            username,
            type: 'CLEAR'
        };

        console.log('📤 Sending clear message:', message);

        this.client.publish({
            destination: '/app/musicbox/clear',
            body: JSON.stringify(message)
        });
    }

    /**
     * WebSocket 연결 종료
     */
    disconnect() {
        if (this.client) {
            console.log('👋 Disconnecting Music Box WebSocket...');

            // 모든 구독 취소
            this.subscriptions.forEach(sub => sub.unsubscribe());
            this.subscriptions = [];

            // 연결 종료
            this.client.deactivate();
            this.connected = false;
            this.client = null;
        }
    }

    /**
     * 연결 상태 확인
     */
    isConnected() {
        return this.connected;
    }
}

// 싱글톤 인스턴스 생성 및 export
const musicBoxWebSocketService = new MusicBoxWebSocketService();
export default musicBoxWebSocketService;
