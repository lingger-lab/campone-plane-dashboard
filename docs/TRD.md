# CampOne 관리자 대시보드 - TRD (Technical Requirements Document)

**버전**: 1.0
**작성일**: 2025-01-10

---

## 1. 기술 스택

### 1.1 프론트엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 14.x | App Router 기반 풀스택 프레임워크 |
| TypeScript | 5.x | 타입 안정성 |
| Tailwind CSS | 3.x | 유틸리티 기반 스타일링 |
| shadcn/ui | latest | UI 컴포넌트 라이브러리 |
| React Query (TanStack) | 5.x | 서버 상태 관리 |
| Zustand | 4.x | 클라이언트 상태 관리 |
| React Hook Form | 7.x | 폼 관리 |
| MSW | 2.x | Mock Service Worker (개발/데모용) |

### 1.2 개발 도구
- **ESLint + Prettier**: 코드 품질
- **Vitest / Jest**: 단위 테스트
- **Playwright**: E2E 테스트

---

## 2. 프로젝트 구조

```
src/
├─ app/
│   ├─ layout.tsx              # 루트 레이아웃
│   ├─ page.tsx                # 대시보드 홈 (/)
│   ├─ (modules)/
│   │   ├─ pulse/              # M1 Insights
│   │   │   ├─ page.tsx        # 랜딩 포스터
│   │   │   └─ manage/
│   │   │       └─ page.tsx    # 관리 화면
│   │   ├─ studio/             # M2 Studio
│   │   │   ├─ page.tsx
│   │   │   ├─ manage/
│   │   │   └─ banners/        # 현수막 디자이너
│   │   ├─ policy/             # M3 Policy Lab
│   │   ├─ ops/                # M4 Ops
│   │   └─ hub/                # M5 Civic Hub
│   ├─ channels/               # 채널 링크 관리
│   ├─ roles/                  # RBAC 관리
│   ├─ audit/                  # 활동 로그
│   ├─ settings/               # 설정
│   └─ api/                    # API Routes (mock)
│
├─ components/
│   ├─ layout/
│   │   ├─ AppHeader.tsx       # 64px 상단 헤더
│   │   ├─ AppFooter.tsx       # 44px 하단 푸터
│   │   ├─ Sidebar.tsx         # 사이드바 네비게이션
│   │   └─ Breadcrumb.tsx      # 브레드크럼
│   ├─ dashboard/
│   │   ├─ KPICard.tsx         # KPI 카드 컴포넌트
│   │   ├─ ModuleCard.tsx      # 모듈 바로가기 카드
│   │   ├─ ActivityTimeline.tsx # 최근 활동
│   │   └─ AlertCenter.tsx     # 알림 센터
│   ├─ common/
│   │   ├─ DataTable.tsx       # 범용 테이블
│   │   ├─ KanbanBoard.tsx     # 칸반 보드
│   │   ├─ Calendar.tsx        # 캘린더 뷰
│   │   ├─ Drawer.tsx          # CRUD 드로어
│   │   ├─ RichEditor.tsx      # 리치 텍스트 에디터
│   │   └─ FileUploader.tsx    # 파일 업로더
│   └─ ui/                     # shadcn/ui 컴포넌트
│
├─ lib/
│   ├─ types.ts                # 타입 정의
│   ├─ rbac.ts                 # 권한 체크 유틸
│   ├─ trendIndex.ts           # 여론 지수 계산
│   ├─ formatters.ts           # 날짜/숫자 포맷터
│   └─ api.ts                  # API 클라이언트
│
├─ stores/
│   ├─ useAuth.ts              # 인증 상태
│   ├─ useAlerts.ts            # 알림 상태
│   ├─ useQuickCreate.ts       # 빠른 생성 모달
│   └─ useTheme.ts             # 테마 상태
│
├─ mocks/
│   ├─ handlers.ts             # MSW 핸들러
│   ├─ browser.ts              # 브라우저 MSW 설정
│   └─ data/
│       ├─ contacts.json
│       ├─ segments.json
│       ├─ messages.json
│       ├─ events.json
│       ├─ donations.json
│       ├─ tasks.json
│       ├─ assets.json
│       ├─ trends.json
│       ├─ trends.config.json
│       └─ channelLinks.json
│
└─ styles/
    └─ globals.css             # 전역 스타일
```

---

## 3. API 계약

### 3.1 공통 규격
- **Base URL**: `/api/v1`
- **인증**: JWT Bearer Token
- **에러 형식**: `{ code: string, message: string, details?: any }`
- **공통 쿼리**: `q`, `page`, `pageSize`, `sort`, `filter[field]`

### 3.2 엔드포인트 정의

#### Contacts / Segments
```
GET    /contacts                    → { items: Contact[], total: number }
POST   /contacts                    → Contact
PUT    /contacts/:id                → Contact
DELETE /contacts/:id                → { success: boolean }

GET    /segments                    → { items: Segment[], total: number }
POST   /segments                    → Segment
POST   /segments/:id/build          → { jobId: string }  // 조건 빌드
```

#### Campaigns / Messages
```
GET    /campaigns                   → { items: Campaign[], total: number }
POST   /campaigns                   → Campaign

POST   /messages/preview            → { rendered: string }  // 변수 치환
POST   /messages/send               → { jobId: string }
       Body: { campaignId, when?, segmentId }

GET    /messages/:id/metrics        → { sent, delivered, opened, replied }
```

#### Events / Donations / Tasks
```
GET    /events                      → { items: Event[], total: number }
POST   /events                      → Event

GET    /donations/stats?range=30d   → { total: number, daily: DailyStat[] }

GET    /tasks                       → { items: Task[], total: number }
PATCH  /tasks/:id                   → Task  // 상태 전이
```

#### Audit / Alerts
```
GET    /audit                       → { items: AuditLog[], total: number }
GET    /alerts                      → { items: Alert[], unread: number }
```

#### Channels
```
GET    /channels                    → { items: ChannelLink[] }
PUT    /channels/:key               → ChannelLink
```

#### Banner Designer
```
GET    /banners/presets             → { items: BannerPreset[] }
POST   /banners/render              → { fileUrl: string, previewUrl: string }
       Body: { presetId, variables: { candidate, slogan, contact, qrUrl, theme } }
```

#### Trends (여론 지수)
```
GET    /trends?range=30d            → { items: TrendData[], baseline, weights }
GET    /trends/index?range=30d      → { items: TrendIndex[], wow: number }
POST   /trends/import               → { imported: number, ignored: number }
GET    /trends/alerts               → { spikes: Spike[], topKeywords: string[] }
```

### 3.3 응답 예시
```json
// GET /api/v1/messages/m001/metrics
{
  "id": "m001",
  "metrics": {
    "sent": 1200,
    "delivered": 1180,
    "opened": 540,
    "replied": 120
  },
  "updatedAt": "2025-01-09T10:30:00+09:00"
}
```

---

## 4. 데이터 스키마

### 4.1 Contact
```typescript
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  region: string;
  tags: string[];
  optIn: boolean;
  createdAt: string;  // ISO 8601
}
```

### 4.2 Segment
```typescript
interface Segment {
  id: string;
  name: string;
  criteria: {
    region?: string;
    tags?: string[];
    [key: string]: any;
  };
  size: number;
  updatedAt: string;
}
```

### 4.3 Message
```typescript
interface Message {
  id: string;
  campaignId: string;
  channel: 'sms' | 'kakao' | 'email';
  templateId: string;
  subject: string | null;
  body: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  sendAt: string | null;
  abGroup: 'A' | 'B' | null;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    replied: number;
  };
}
```

### 4.4 Event
```typescript
interface Event {
  id: string;
  title: string;
  type: '오프라인' | '온라인' | '하이브리드';
  location: string;
  start: string;
  end: string;
  attendeeTarget: number;
  status: 'planning' | 'scheduled' | 'completed' | 'cancelled';
}
```

### 4.5 TrendData
```typescript
interface TrendData {
  date: string;
  google: number;      // 0-100
  naver: number;       // 0-100
  snsMentions: number;
  snsPos: number;
  snsNeg: number;
}

interface TrendWeights {
  gt: number;  // 0.30
  nv: number;  // 0.30
  sns: number; // 0.40
}
```

---

## 5. 브랜딩 & 디자인 시스템

### 5.1 컬러 팔레트
| 용도 | HEX | 설명 |
|------|-----|------|
| Primary | `#2563EB` | 주요 액션, 링크 |
| Secondary | `#111827` | 텍스트, 배경 |
| Accent | `#22C55E` | 강조, 성공 보조 |
| Success | `#16A34A` | 성공 상태 |
| Warning | `#F59E0B` | 경고 상태 |
| Danger | `#DC2626` | 에러, 삭제 |

> AA 대비 4.5:1 이상 준수

### 5.2 타이포그래피
- **헤드라인**: 24–28px, font-weight: 600-700
- **본문**: 16–18px, font-weight: 400
- **수치/데이터**: 모노스페이스 권장 (Roboto Mono, JetBrains Mono)

### 5.3 컴포넌트 톤앤매너
- Border Radius: `2xl` (16px)
- Shadow: 소프트 섀도 (`shadow-sm`, `shadow-md`)
- Spacing: 8pt 스케일 (8, 16, 24, 32, 40, 48...)
- Icon: 아이콘 + 라벨 병기

### 5.4 반응형 브레이크포인트
| 브레이크포인트 | 컬럼 |
|---------------|------|
| 1440px (Desktop XL) | 12 col |
| 1024px (Desktop) | 12 col |
| 768px (Tablet) | 8 col |
| 390px (Mobile) | 4 col |

---

## 6. UI 컴포넌트 키트

### 6.1 버튼
```typescript
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant: ButtonVariant;
  size: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}
```

### 6.2 입력 컴포넌트
- Text / Number / Date-Time
- Select / MultiSelect
- Toggle / Slider
- File Upload (CSV/이미지, 드래그앤드롭)

### 6.3 상태 카피
| 상태 | 메시지 |
|------|--------|
| Loading | "데이터 불러오는 중…" |
| Empty | "＋새로 만들기" |
| Error | "다시 시도" |
| Success | "저장되었습니다." |

### 6.4 모달/드로어
- 포커스 트랩
- ESC / 외부 클릭 닫기
- Size: `sm`, `md`, `lg`, `xl`

### 6.5 토스트
- Type: `success`, `info`, `warning`, `error`
- 자동 닫힘: 3-5초

---

## 7. 헤더 & 푸터 상세

### 7.1 헤더 (64px)
| 영역 | 내용 |
|------|------|
| 좌측 | CampOne 로고, 캠페인 스위처, 브레드크럼 |
| 중앙 | 전역 검색 (⌘/Ctrl+K) |
| 우측 | 채널 퀵링크, 빠른생성, 알림, 도움말, 프로필 |

**접근성**: `role="banner"`, `aria-label`, 툴팁, 포커스 링

### 7.2 푸터 (44px)
| 영역 | 내용 |
|------|------|
| 좌측 | 시스템 상태 (●API / ●Queue / ●Deploy) + 슬로건 |
| 중앙 | 버전 `v1.0.0-demo`, 릴리스 노트, 단축키 `?` |
| 우측 | 언어(KO/EN), 테마(라이트/다크), 사이트 열어보기 |

---

## 8. 접근성 요구사항

- 키보드 탐색 지원
- `aria-label`, `role` 속성 적용
- 테이블 헤더 `scope` 속성
- 라이브 영역 `aria-live="polite"`
- 색상 대비 4.5:1 이상
- 다크모드 지원

---

## 9. 현수막 디자이너 스펙

### 9.1 프리셋 사이즈
| 이름 | 크기 |
|------|------|
| 가로형 대 | 3600 × 900 mm |
| 가로형 중 | 4000 × 700 mm |
| 가로형 광폭 | 5000 × 900 mm |
| 가로형 초광폭 | 7000 × 900 mm |
| 세로형 | 600 × 1800 mm |

### 9.2 속성
- 해상도: 300dpi
- 컬러모드: CMYK
- 여백/안전영역: 20mm
- QR 코드: 자동 배치
- 변수: `{{후보명}}`, `{{직함}}`, `{{슬로건}}`, `{{연락처}}`

### 9.3 내보내기
- 형식: PDF, PNG
- 재단선 옵션 포함
- 파일명: `YYYYMMDD_지역_행사명_size.pdf`

---

## 10. 보안 요구사항

- JWT 토큰 기반 인증
- HTTPS 필수
- XSS/CSRF 방어
- API Rate Limiting
- 민감 데이터 암호화 (연락처, 후원 정보)
