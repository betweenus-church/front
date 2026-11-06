# @sai/ui

실제 client/admin이 사용하는 CHZZK 기반 다크·민트 디자인 시스템입니다. tokens.css는 제공 토큰과 기존 스타일 연결용 크기·간격, base.css는 기본 요소, components.css는 버튼·입력·탭 등의 공통 컴포넌트, theme.css는 의미 토큰 연결과 공통 상태를 담당합니다. 원래 자료와 출처는 GUIDE.md를 참고하세요.

각 앱은 tokens/base를 먼저 불러오고, 앱 기본 스타일 다음에 components/theme를 불러옵니다. client의 화면 배치는 client/src/app/chzzk-theme.css, 관리자 전용 스타일은 admin에 둡니다.
