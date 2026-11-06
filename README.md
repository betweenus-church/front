# 사이 프런트 모노레포

실제 프로젝트: C:/Users/seok1/OneDrive/Desktop/front

```text
front/
├─ client/              사용자 Next.js 앱 (3001)
│  ├─ src/app/          community, login, signup 등 사용자 라우트
│  ├─ src/components/  사용자 전용 컴포넌트
│  └─ src/store/       사용자 세션·화면 상태
├─ admin/               관리자 Next.js 앱 (3002)
│  ├─ src/app/admin/   승인, 구성원, 소식, 신고, 설정
│  └─ src/components/  관리자 전용 컴포넌트
├─ packages/
│  ├─ shared/src/      공통 API, 데이터 타입, 날짜, 앱 이동 URL
│  └─ ui/src/          공통 색상 토큰·기본 HTML/컨트롤 스타일
├─ scripts/             워크스페이스 경계 검증
├─ package.json
├─ pnpm-workspace.yaml
└─ pnpm-lock.yaml
```

## 현재 운영: 한 서버 · 한 주소

- 사용자 앱: https://junsee.tail1d9293.ts.net/community/home
- 관리자 앱: https://junsee.tail1d9293.ts.net/admin/approvals
- 같은 PC에서 client 3101, admin 3102를 127.0.0.1에 바인딩합니다.
- Tailscale Funnel은 3101로 연결합니다. 사용자 앱이 /admin 및 /admin-static 경로를 관리자 앱으로 전달합니다.
- 두 앱은 기존 운영 API 4000을 공유합니다. 운영 API와 DB는 교체하지 않았습니다.

```sh
pnpm build:server
pnpm start:server
# 종료
pnpm stop:server
```

.env.server.example을 참고해 루트 .env.server에 공개 origin, 운영 API, 내부 포트를 설정합니다. NEXT_PUBLIC_CLIENT_URL과 관리자 정적 파일 prefix는 운영 빌드 시 적용되므로 주소 설정 변경 후에는 다시 빌드합니다. 운영 빌드는 각 앱의 .next-production을 사용해 개발 빌드와 구분합니다.

현재 두 앱은 숨겨진 통합 프로세스로 실행 중입니다. 종료·재배포 때는 stop:server → build:server → start:server 순으로 실행합니다. 로그와 실행 PID는 .server에 보관하며 저장소에서 제외합니다. PC 재부팅 후 자동 실행은 설정하지 않았으므로 기존 운영 API를 실행한 다음 start:server를 실행합니다.

일반 pnpm dev는 기존 3001/3002 개발 환경을 계속 사용합니다. 일반 pnpm build/start와 운영 전용 build:server/start:server는 서로 다른 빌드 폴더를 사용합니다.

## 개발 실행

Node.js 24 이상, pnpm 11.25.0을 사용합니다. 루트에서 의존성을 한 번 설치합니다.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

- 사용자: http://127.0.0.1:3001/community/home
- 관리자: http://127.0.0.1:3002/admin/approvals
- 관리자 루트와 /admin은 대시보드로 이동합니다.
- 개발 중 기존 3001의 /admin/... 주소는 3002의 같은 관리자 경로로 이동합니다.
- API는 별도 back 서버가 필요합니다. 기본 개발 API는 4100입니다.

| 루트 명령 | 동작 |
| --- | --- |
| pnpm dev | 두 개발 서버 함께 실행 |
| pnpm dev:client / pnpm dev:admin | 각 개발 서버만 실행 |
| pnpm check | 공통 패키지 연결·앱 경계 검사 |
| pnpm typecheck | 두 앱 경로 타입·TypeScript 검사 |
| pnpm build | 두 앱 각각 빌드 |
| pnpm build:client / pnpm build:admin | 각 앱만 빌드 |
| pnpm start | 빌드한 두 앱 실행 |
| pnpm start:client / pnpm start:admin | 빌드한 앱 하나만 실행 |
| pnpm build:qa / pnpm start:qa | 기존 사용자 앱 QA 명령, QA 포트 3003, API 4200 |

npm run dev 등 npm run 명령으로도 루트 스크립트를 실행할 수 있습니다. 의존성 설치·잠금 파일은 pnpm으로 관리합니다. 각 앱은 src, public, Next 설정, 빌드 폴더를 독립적으로 가집니다.

## 공통 코드 규칙

공통 코드는 패키지 공개 경로로 가져옵니다. 다른 앱의 src를 직접 참조하지 않습니다.

```tsx
import { api, json } from "@sai/shared/api";
import type { NewsItem } from "@sai/shared/news";
import "@sai/ui/tokens.css";
import "@sai/ui/base.css";
```

관리자 전용 컴포넌트와 상태는 admin, 사용자 전용 컴포넌트와 Zustand 상태는 client에 남겼습니다. 실제로 두 앱이 사용하는 코드만 packages로 옮겼습니다. 기존 UI, API 인증·권한 검사는 유지합니다.

## 환경 변수와 배포

각 앱의 .env.example을 참고해 해당 앱 폴더에서 환경 파일을 관리합니다. API_INTERNAL_URL은 서버 전용 프록시 주소입니다. 백엔드 비밀번호나 DB 설정을 프런트에 넣지 않습니다.

- client: API_INTERNAL_URL, ADMIN_URL(관리자 공개 origin).
- admin: API_INTERNAL_URL, NEXT_PUBLIC_CLIENT_URL(사용자 앱 공개 origin, 빌드 시 설정).
- 배포 시 각 앱을 별도로 빌드·실행하고 위 origin들을 실제 주소로 맞춥니다. production에서 ADMIN_URL을 지정하지 않으면 사용자 앱의 관리자 이전 주소 redirect는 생성하지 않습니다.
- back: FRONTEND_ORIGIN에 사용자 앱 origin, ADMIN_ORIGIN에 관리자 origin을 명시합니다. 외부 origin 차단은 유지합니다.

현재 로컬 back은 .env.test로 실행하며 이 앱 분리를 위한 별도 .test-data/client-admin DB를 사용합니다. 기존 미리보기 DB와 운영 DB는 보존했습니다. 운영 서버 배포는 수행하지 않았습니다.

## 검증 범위

각 앱 타입 검사와 빌드, 앱 경계 검사, 사용자 가입·관리자 승인·말씀/기도 작성·관리자 로그인·앱 간 이동·잘못된 origin 차단을 확인합니다. 검증용 계정과 게시글은 검사 후 삭제합니다.

관리자 소식 표지의 이미지 압축은 admin/src/lib/compress-image.ts에 둡니다. 관리자에서만 사용하는 기능이므로 공통 패키지에 넣지 않습니다.

## 현재 적용한 디자인

CHZZK 레퍼런스의 #141517 배경, #00e693 주요 액션과 #dfe2ea 본문을 실제 client/admin에 적용했습니다. 공통 토큰·기본 요소·버튼·입력·포커스는 packages/ui, 사용자 화면 배치는 client/src/app/chzzk-theme.css와 sai-ui.css, 관리자 화면 스타일은 admin에 있습니다. 하이드레이션 body 호환 처리는 두 앱 루트 레이아웃에 유지합니다.
