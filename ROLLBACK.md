# 운영 웹 되돌리기

이전 웹 빌드와 기존 운영 API/DB는 그대로 보존했습니다. 현재 공개 주소는 새 front 통합 서버 3101로 연결됩니다.

1. 이전 웹 실행 스크립트 D:/02. 기록 영상/02. 데이터/office/projects/교회/operations/run-production.ps1을 -Service web 인자로 실행해 3000을 다시 켭니다. 백그라운드 실행 시 Windows 창은 숨김으로 설정합니다.
2. 로컬 3000 응답을 확인한 뒤 tailscale funnel --bg --yes http://127.0.0.1:3000 으로 HTTPS 연결을 이전 웹으로 돌립니다.
3. 공개 주소를 확인한 뒤 새 front 루트에서 pnpm stop:server로 새 두 앱을 종료합니다.

API와 DB를 복원하거나 새 back을 운영 DB에 연결할 필요는 없습니다. 프런트 소스 변경 전 백업은 별도 .hallmark/before-same-server-* 폴더에 보관했습니다.
