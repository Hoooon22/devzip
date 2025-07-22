-- TraceBoard 성능 최적화를 위한 인덱스 생성
-- 이 스크립트는 프로덕션 배포 전에 실행해주세요.

-- 1. occurred_at 컬럼에 인덱스 생성 (시간 기반 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_occurred_at ON event_logs (occurred_at DESC);

-- 2. event_type 컬럼에 인덱스 생성 (이벤트 타입별 필터링 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs (event_type);

-- 3. user_id 컬럼에 인덱스 생성 (사용자별 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs (user_id);

-- 4. session_id 컬럼에 인덱스 생성 (세션별 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_session_id ON event_logs (session_id);

-- 5. 복합 인덱스: event_type + occurred_at (이벤트 타입별 시간 범위 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_type_time ON event_logs (event_type, occurred_at DESC);

-- 6. 복합 인덱스: user_id + occurred_at (사용자별 시간 범위 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_user_time ON event_logs (user_id, occurred_at DESC);

-- 7. path 컬럼에 인덱스 생성 (페이지별 분석 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_path ON event_logs (path);

-- 8. 복합 인덱스: path + event_type (페이지뷰 분석 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_path_type ON event_logs (path, event_type);

-- 9. created_at 컬럼에 인덱스 생성 (생성 시간 기반 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs (created_at DESC);

-- 10. 복합 인덱스: occurred_at + event_type + path (대시보드 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_event_logs_dashboard ON event_logs (occurred_at DESC, event_type, path);

-- API Keys 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_api_keys_key_value ON api_keys (key_value);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys (is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys (expires_at);

-- 테이블 통계 업데이트 (MySQL 8.0+)
ANALYZE TABLE event_logs;
ANALYZE TABLE api_keys;

-- 인덱스 생성 완료 확인 쿼리
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    COLLATION,
    CARDINALITY
FROM 
    INFORMATION_SCHEMA.STATISTICS 
WHERE 
    TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME IN ('event_logs', 'api_keys')
ORDER BY 
    TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;