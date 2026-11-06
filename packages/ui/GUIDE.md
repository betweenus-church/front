# CHZZK 레퍼런스 디자인 시스템

사용자가 제공한 dembrandt 추출 텍스트와 같은 공개 페이지의 보관된 추출 JSON을 바탕으로 재구성한 다크 테마 라이브러리입니다. 공식 치지직 디자인 시스템이 아닙니다.

## 바로 사용하기

`index.html`을 브라우저로 열면 됩니다. 빌드·설치·외부 네트워크가 필요하지 않습니다. `tokens.css`와 `components.css`를 제품에 복사하세요. `preview.css`와 `preview.js`는 문서와 데모 전용입니다.

```html
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">
<button class="button button-primary">팔로우</button>
<label for="search">검색</label>
<input id="search" class="input" placeholder="검색어 입력">
```

## 토큰 계층

| 계층 | 예 | 사용 |
| --- | --- | --- |
| 원시값 | `--neutral-900`, `--mint-500` | 팔레트와 수치 정의 |
| 의미 | `--bg-canvas`, `--text-primary`, `--brand` | 제품 스타일에서 우선 사용 |
| 컴포넌트 | `--button-primary-bg`, `--control-radius` | 여러 컴포넌트의 일관성 |

`tokens.json`은 이 라이브러리의 단순 JSON 스키마입니다. 각 토큰의 `value`, `group`, `origin`, `description`을 제공합니다. 전용 DTCG 파일로 표방하지 않습니다. `var(--...)` 참조는 CSS 토큰명과 일치합니다.

## 출처와 설계 결정

- `observed` / 관측: 제공된 텍스트와 보관된 JSON의 실제 값입니다. 색상·크기·간격·반경·굵기·모션 값이 포함됩니다. 토큰 이름은 이 시스템에서 새로 정했습니다.
- `mapped` / 역할 정리: 관측값을 새로운 의미로 연결했습니다. 추출기에서 `primary`로 선택한 `#dfe2ea`는 본문색입니다. `#00e693`은 브랜드·액션색으로 채택했습니다. 이 역할 분류는 설계 판단입니다.
- `proposed` / 확장: 공통 컨트롤 높이 44px, 본문 행간 1.6, 24/32/48/64px 간격, 오류색 `#ff8080`, 민트 hover `#00ffa3` 불투명값, 레이아웃 최대 폭 등입니다.
- 입력창은 원본에서 0개 스타일로 보고됐습니다. 입력 검증·스위치·성공 및 오류 메시지·탭 키보드 동작·콘텐츠 카드 조합은 새롭게 설계한 패턴입니다.
- 추출된 수많은 CSS 변수·문맥별 색상과 180px 이상의 레이아웃 측정값은 공통 토큰으로 승격하지 않았습니다. 1~30px 관측 간격은 보존했습니다.
- 원문 로고의 0~2px safe zone은 측정된 여백입니다. 브랜드 최소 보호 공간으로 해석하지 않았습니다. 실제 로고와 폰트 파일은 재배포하지 않습니다.
- 글꼴은 관측된 Pretendard와 시스템 폰트를 정리한 스택입니다. Pretendard가 설치되지 않은 Windows에서는 맑은 고딕 등 시스템 폰트로 표시됩니다.
- 768px와 1200px은 관측된 분기점 중 선택한 반응형 기준입니다. 분기점 값은 `tokens.json`과 CSS 미디어 쿼리에 기록돼 있습니다. CSS 변수는 미디어 쿼리 조건에 직접 쓰지 않습니다.
- 라이트 테마와 전체 사이트의 모든 컴포넌트는 이 단일 페이지 추출로 확인되지 않았습니다.

## 컴포넌트 계약

| 컴포넌트 | 클래스와 속성 | 상태 |
| --- | --- | --- |
| 버튼 | `.button` + `.button-primary / -secondary / -ghost` | hover, active, focus-visible, disabled |
| 로딩 버튼 | `aria-busy="true" aria-disabled="true"` | 스피너 표시; 앱 코드에서 중복 실행 차단 필요 |
| 입력창 | `.input`, 연결된 `<label>` | focus, disabled, `aria-invalid="true"` |
| 도움말 | `.field-help`, `.error / .success` | 입력에 `aria-describedby`로 연결 |
| 체크박스 | `.checkbox-label` 내부 네이티브 input | checked, unchecked, disabled |
| 스위치 | `.switch-label` 내부 checkbox + `.switch-track` | 네이티브 체크 상태와 `role="switch"` |
| 탭 | `.tabs`, `.tab`, `.tab-panel` | ARIA 연결 및 방향키, Home, End 처리 |
| 칩 | `.chip`, `aria-pressed` | 한 항목 선택 |
| 배지 | `.badge` + `.badge-live / -neutral / -brand` | 텍스트로 상태 표시 |
| 알림 | `.notice` + `.notice-success / -error` | 동적 메시지는 제품에서 `role="status"` 또는 `alert` 지정 |
| 카드 | `.content-card`, `.card-body`, `.avatar` | 콘텐츠와 액션 조합 |

`data-state`는 상태를 강제로 보여주는 문서용 속성입니다. 제품에서는 네이티브 `:hover`, `:active`, `:focus-visible`과 `disabled`를 사용하세요. 카드의 팔로우와 입력 확인은 데모이며 실제 서비스에 연결되지 않습니다. 탭·스위치·검증의 앱 로직은 제품이 소유하며 `preview.js`는 복사 가능한 참고 구현입니다.

## 대비와 접근성

- 주요 본문색과 민트 버튼 대비 수치는 미리보기에서 실제 토큰으로 계산합니다. 이 수치는 일부 색 조합 검증이며 전체 접근성 인증을 의미하지 않습니다.
- 작은 LIVE 배지는 원본 빨강 `#e02020`과 흰색을 유지합니다. 오류 본문에는 읽기 쉬운 확장색을 별도로 씁니다.
- 키보드 포커스는 2px 민트 테두리와 4px 간격입니다. 명확한 라벨, 도움말 연결, 텍스트 오류 메시지를 유지합니다.
- 기본 컨트롤은 44px 높이이며 원형/작은 배지는 상호작용 요소로 사용하지 않습니다. 체크박스는 라벨 전체가 클릭 영역입니다.
- 사용자 `prefers-reduced-motion: reduce` 설정에서는 애니메이션과 전환을 제거합니다.
- 카테고리 탭은 좌우 방향키·Home·End로 이동합니다. 토큰 검색, 복사, 버튼 상태 전환, 팔로우, 입력 검증을 직접 시험할 수 있습니다.

## 파일 구성

- `index.html`: 미리보기와 문서
- `tokens.css`: 원시·의미·컴포넌트 토큰
- `tokens.json`: 출처 구분이 포함된 기계 판독용 토큰
- `components.css`: 재사용 가능한 컴포넌트
- `preview.css`, `preview.js`: 문서 레이아웃과 동작
- `GUIDE.md`: 적용 가이드와 출처

## 검증 기록

Chromium에서 1440, 1200, 1024, 768, 390, 320px 폭의 가로 넘침, 토큰 참조, 검색, 복사 안내, 버튼 상태, 입력 오류와 성공, 방향키 탭 이동, 칩 선택, 팔로우 토글, 스위치와 모션 줄이기를 확인했습니다. JavaScript 실행 오류가 없었습니다. 화면도 데스크톱과 모바일로 렌더링해 확인했습니다. 스크린리더와 다른 브라우저의 전체 검증은 포함하지 않습니다.

본문 `#dfe2ea` / 배경 `#141517` 대비는 14.10:1, 버튼 글자 `#141517` / 민트 `#00e693`은 11.08:1입니다. 일부 조합의 측정치이며 전체 접근성 인증은 아닙니다.
