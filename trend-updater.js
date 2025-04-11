/**
 * 트렌드 데이터 자동 업데이트 스크립트
 * PM2로 실행하여 주기적으로 트렌드 데이터를 업데이트합니다.
 * 
 * 사용 방법:
 * 1. Node.js가 설치되어 있어야 합니다.
 * 2. PM2 설치: npm install -g pm2
 * 3. 스크립트 실행: pm2 start trend-updater.js --name "trend-updater" --cron "0 */2 * * *"
 * 4. 상태 확인: pm2 status
 * 5. 로그 확인: pm2 logs trend-updater
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 현재 시간 출력 함수
function getCurrentTime() {
  return new Date().toISOString();
}

// 로그 파일 경로
const logDir = path.join(__dirname, 'logs');
const logFile = path.join(logDir, 'trend_update.log');

// 로그 디렉토리가 없으면 생성
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  console.log(`로그 디렉토리 생성: ${logDir}`);
}

// 스크립트 경로
const scriptPath = path.join(__dirname, 'src', 'main', 'resources', 'update_trends.sh');

// 스크립트 실행 권한 확인 및 부여
try {
  fs.accessSync(scriptPath, fs.constants.X_OK);
} catch (err) {
  console.log(`스크립트에 실행 권한 부여: ${scriptPath}`);
  fs.chmodSync(scriptPath, '755');
}

console.log(`[${getCurrentTime()}] 트렌드 업데이트 시작...`);

try {
  // 스크립트 실행
  const output = execSync(`bash ${scriptPath}`, { encoding: 'utf8' });
  
  // 콘솔에 출력
  console.log(output);
  
  // 로그 파일에 기록
  fs.appendFileSync(logFile, `\n[${getCurrentTime()}] 트렌드 업데이트 성공:\n${output}\n`);
  
  console.log(`[${getCurrentTime()}] 트렌드 업데이트 완료`);
} catch (error) {
  // 에러 로깅
  const errorMessage = `[${getCurrentTime()}] 오류 발생: ${error.message}\n${error.stderr || ''}\n`;
  console.error(errorMessage);
  
  // 로그 파일에 기록
  fs.appendFileSync(logFile, errorMessage);
  
  // 종료 코드 반환
  process.exitCode = 1;
}

// PM2 cron 작업이므로 명시적으로 종료하지 않음 