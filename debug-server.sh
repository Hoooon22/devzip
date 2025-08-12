#!/bin/bash
# DevZip 서버 디버깅 스크립트

echo "🔍 DevZip 서버 상태 분석 시작..."
echo "======================================"

echo ""
echo "📊 1. Docker 컨테이너 상태"
echo "------------------------------"
docker ps -a

echo ""
echo "🗃️ 2. 데이터베이스 연결 테스트"
echo "------------------------------"
# MySQL 컨테이너가 실행 중인지 확인
MYSQL_CONTAINER=$(docker ps --format "table {{.Names}}" | grep -i mysql || echo "MySQL 컨테이너 없음")
echo "MySQL 컨테이너: $MYSQL_CONTAINER"

# 헬스체크 엔드포인트 확인
echo ""
echo "🏥 3. 애플리케이션 헬스체크"
echo "------------------------------"
HEALTH_STATUS=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8080/actuator/health 2>/dev/null || echo "000")
echo "헬스체크 응답 코드: $HEALTH_STATUS"

echo ""
echo "📋 4. 최근 애플리케이션 로그 (마지막 50줄)"
echo "------------------------------"
docker compose logs --tail=50 devzip-app 2>/dev/null || docker logs devzip-app --tail=50 2>/dev/null || echo "로그를 가져올 수 없습니다"

echo ""
echo "❌ 5. 에러 로그 필터링 (마지막 20개)"
echo "------------------------------"
docker compose logs devzip-app 2>/dev/null | grep -i "error\|exception\|failed" | tail -20 || echo "에러 로그 없음"

echo ""
echo "🔧 6. 포트 사용 상태"
echo "------------------------------"
netstat -tlnp | grep :8080 || echo "8080 포트 사용 중인 프로세스 없음"

echo ""
echo "💾 7. 시스템 리소스 상태"
echo "------------------------------"
echo "메모리 사용량:"
free -h
echo ""
echo "디스크 사용량:"
df -h | grep -E "/$|devzip"

echo ""
echo "🚀 8. 최근 배포 상태"
echo "------------------------------"
echo "마지막 Git 커밋:"
git log --oneline -3

echo ""
echo "======================================"
echo "🔍 분석 완료. 위 정보를 개발자에게 전달하세요."
echo ""

echo "💡 추가 디버깅 명령어:"
echo "• 실시간 로그 확인: docker compose logs -f devzip-app"
echo "• 컨테이너 내부 접속: docker exec -it devzip-app /bin/bash"
echo "• 데이터베이스 접속: docker exec -it [mysql컨테이너명] mysql -u root -p"
echo "• 서비스 재시작: docker compose restart"