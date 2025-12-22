# CampOne 관리자 대시보드 - 구현 태스크

**버전**: 1.0
**작성일**: 2025-01-10

---

## Phase 1: 프로젝트 초기화 및 기반 구축

### 1.1 프로젝트 설정
- [ ] Next.js 14 프로젝트 생성 (App Router)
- [ ] TypeScript 설정
- [ ] Tailwind CSS 설정
- [ ] shadcn/ui 초기화
- [ ] ESLint + Prettier 설정
- [ ] 폴더 구조 생성

### 1.2 기본 타입 정의
- [ ] `src/lib/types.ts` - 모든 인터페이스 정의
  - [ ] Contact, Segment
  - [ ] Message, Campaign
  - [ ] Event, Donation, Task
  - [ ] TrendData, TrendWeights
  - [ ] Alert, AuditLog
  - [ ] ChannelLink, BannerPreset

### 1.3 Mock 데이터 설정
- [ ] MSW 설정 (`src/mocks/browser.ts`)
- [ ] Mock 데이터 JSON 파일 생성
  - [ ] contacts.json
  - [ ] segments.json
  - [ ] messages.json
  - [ ] events.json
  - [ ] donations.json
  - [ ] tasks.json
  - [ ] assets.json
  - [ ] trends.json
  - [ ] channelLinks.json
- [ ] MSW 핸들러 작성 (`src/mocks/handlers.ts`)

### 1.4 유틸리티 함수
- [ ] `src/lib/trendIndex.ts` - 여론 지수 계산
- [ ] `src/lib/formatters.ts` - 날짜/숫자 포맷터
- [ ] `src/lib/rbac.ts` - 권한 체크 유틸

---

## Phase 2: 레이아웃 및 공통 컴포넌트

### 2.1 레이아웃 컴포넌트
- [ ] `AppHeader.tsx` (64px)
  - [ ] 로고 + 캠페인 스위처
  - [ ] 전역 검색 (⌘K)
  - [ ] 채널 퀵링크
  - [ ] 빠른 생성 버튼
  - [ ] 알림 아이콘
  - [ ] 프로필 드롭다운
- [ ] `AppFooter.tsx` (44px)
  - [ ] 시스템 상태 인디케이터
  - [ ] 버전 정보
  - [ ] 언어/테마 토글
- [ ] `Sidebar.tsx`
  - [ ] 모듈 네비게이션
  - [ ] 아이콘 + 라벨
  - [ ] 접힘/펼침 기능
- [ ] `Breadcrumb.tsx`
- [ ] 루트 레이아웃 (`app/layout.tsx`)

### 2.2 대시보드 컴포넌트
- [ ] `KPICard.tsx`
  - [ ] 스파크라인 차트
  - [ ] 변화율 표시
  - [ ] 상태 색상 (초록/노랑/빨강)
- [ ] `ModuleCard.tsx`
  - [ ] 포스터 썸네일
  - [ ] 핵심 지표 2-3개
  - [ ] CTA 버튼 3개
- [ ] `ActivityTimeline.tsx`
- [ ] `AlertCenter.tsx`
  - [ ] 시스템/워크플로우 탭
  - [ ] 읽음 처리/고정

### 2.3 공통 UI 컴포넌트
- [ ] `DataTable.tsx` - 범용 테이블
  - [ ] 정렬/필터/검색
  - [ ] 페이지네이션
  - [ ] 행 선택
  - [ ] 빈/에러/로딩 상태
- [ ] `Drawer.tsx` - CRUD 폼 드로어
- [ ] `KanbanBoard.tsx` - 칸반 보드
- [ ] `Calendar.tsx` - 캘린더 뷰
- [ ] `RichEditor.tsx` - 변수 치환 지원
- [ ] `FileUploader.tsx` - CSV/이미지

---

## Phase 3: 대시보드 홈

### 3.1 홈 페이지 구현
- [ ] `app/page.tsx` - 대시보드 홈
- [ ] 브랜딩 헤더 섹션
  - [ ] 후보 로고/이름
  - [ ] 슬로건 슬라이더 (3종)
  - [ ] 상태 배지
- [ ] KPI 카드 그리드 (6+1)
  - [ ] 활성 연락처 수
  - [ ] 메시지 발송/오픈율
  - [ ] 콘텐츠 퍼블리시
  - [ ] 이벤트/참석 목표
  - [ ] 모금 합계
  - [ ] 완료 태스크
  - [ ] 여론 트렌드 지수
- [ ] 모듈 바로가기 카드 (5개)
- [ ] 최근 활동 타임라인
- [ ] 알림 센터 위젯

---

## Phase 4: 모듈 랜딩 포스터

### 4.1 모듈 공통
- [ ] 모듈 포스터 레이아웃 템플릿
- [ ] CTA 버튼 컴포넌트

### 4.2 각 모듈 랜딩 페이지
- [ ] `app/(modules)/pulse/page.tsx` - Insights 포스터
- [ ] `app/(modules)/studio/page.tsx` - Studio 포스터
- [ ] `app/(modules)/policy/page.tsx` - Policy Lab 포스터
- [ ] `app/(modules)/ops/page.tsx` - Ops 포스터
- [ ] `app/(modules)/hub/page.tsx` - Civic Hub 포스터

---

## Phase 5: M1 Insights 모듈

### 5.1 관리 화면
- [ ] `app/(modules)/pulse/manage/page.tsx`
- [ ] 합성 지수 대시보드
- [ ] 이슈 레이더 차트
- [ ] 감성/타임라인 차트
- [ ] 지역 히트맵
- [ ] 리스크 경보 목록
- [ ] 키워드 Top5

---

## Phase 6: M2 Studio 모듈

### 6.1 관리 화면
- [ ] `app/(modules)/studio/manage/page.tsx`
- [ ] 카드메이커
- [ ] 공지/보도자료 에디터
- [ ] 스크립트 관리
- [ ] 콘텐츠 캘린더
- [ ] 에셋 보관함

### 6.2 현수막 디자이너
- [ ] `app/(modules)/studio/banners/page.tsx`
- [ ] 프리셋 선택
- [ ] 변수 입력 폼
- [ ] 실시간 미리보기
- [ ] PDF/PNG 내보내기

---

## Phase 7: M3 Policy Lab 모듈

### 7.1 관리 화면
- [ ] `app/(modules)/policy/manage/page.tsx`
- [ ] 비전/공약 목록
- [ ] 근거 노트 에디터
- [ ] 영향/재원 메모
- [ ] 사례 링크
- [ ] 근거 맵 시각화

---

## Phase 8: M4 Ops 모듈

### 8.1 관리 화면
- [ ] `app/(modules)/ops/manage/page.tsx`
- [ ] 체크리스트 칸반
- [ ] 알림 센터
- [ ] 런북 관리
- [ ] 역할/권한 설정
- [ ] 지표 콘솔

---

## Phase 9: M5 Civic Hub 모듈

### 9.1 관리 화면
- [ ] `app/(modules)/hub/manage/page.tsx`
- [ ] 세그먼트 관리
  - [ ] 세그먼트 생성/편집
  - [ ] 조건 빌더
- [ ] 캠페인 관리
- [ ] 메시지 에디터
  - [ ] 변수 치환 `{{firstName}}`
  - [ ] A/B 테스트 설정
  - [ ] 예약 발송
- [ ] 발송 현황 퍼널
- [ ] 인바운드 문의함

---

## Phase 10: 채널 및 설정

### 10.1 채널 링크
- [ ] `app/channels/page.tsx`
- [ ] 채널 카드 목록
- [ ] 링크 편집 폼
- [ ] 연결 테스트

### 10.2 RBAC
- [ ] `app/roles/page.tsx`
- [ ] 역할 목록
- [ ] 권한 매트릭스

### 10.3 활동 로그
- [ ] `app/audit/page.tsx`
- [ ] 감사 로그 테이블
- [ ] 필터링 (사용자/모듈/날짜)

### 10.4 설정
- [ ] `app/settings/page.tsx`
- [ ] 프로필 설정
- [ ] 알림 설정
- [ ] 테마 설정

---

## Phase 11: 상호작용 및 UX

### 11.1 온보딩 투어
- [ ] 4스텝 투어 구현
- [ ] 브랜딩 헤더 소개
- [ ] 모듈 카드 안내
- [ ] 알림 센터 설명
- [ ] 빠른 생성 가이드

### 11.2 토스트 & 알림
- [ ] 토스트 컴포넌트
- [ ] 성공/경고/에러 템플릿

### 11.3 확인 다이얼로그
- [ ] 삭제 확인
- [ ] 발송 확인
- [ ] 경고 메시지

---

## Phase 12: 테스트 및 QA

### 12.1 단위 테스트
- [ ] 유틸리티 함수 테스트
- [ ] 컴포넌트 테스트

### 12.2 E2E 테스트
- [ ] 주요 플로우 테스트
- [ ] 세그먼트 → 메시지 → 발송

### 12.3 접근성 검증
- [ ] 키보드 네비게이션
- [ ] 스크린 리더 호환성
- [ ] 색상 대비 검증

---

## Phase 13: 최적화 및 배포

### 13.1 성능 최적화
- [ ] 이미지 최적화
- [ ] 코드 스플리팅
- [ ] 번들 사이즈 분석

### 13.2 배포
- [ ] 환경 변수 설정
- [ ] 빌드 스크립트
- [ ] 배포 파이프라인

---

## 우선순위 태스크 (데모용)

> 세일즈 데모 5분 시연을 위한 최소 구현

1. **[P0]** 프로젝트 초기화 + 타입 정의
2. **[P0]** MSW + Mock 데이터
3. **[P0]** 레이아웃 (Header/Footer/Sidebar)
4. **[P0]** 대시보드 홈 (KPI + 모듈카드)
5. **[P1]** 모듈 랜딩 포스터 5개
6. **[P1]** Civic Hub 세그먼트 → 메시지 플로우
7. **[P2]** 나머지 모듈 관리 화면
8. **[P2]** 채널/설정/RBAC
9. **[P3]** 온보딩 투어
10. **[P3]** 테스트 및 최적화

---

## 진행 상태 범례

- [ ] 미시작
- [~] 진행중
- [x] 완료
- [-] 보류/취소
