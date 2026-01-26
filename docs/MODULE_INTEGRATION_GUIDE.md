# CampOne Dashboard 모듈 통합 가이드 v3.0

> 작성일: 2026-01-25
> 대상: 신규 모듈 개발팀 (Insights, Studio, Policy, Ops, Hub)
> 목적: Dashboard에 임베드되는 모듈 개발을 위한 종합 가이드

---

## 목차

1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
2. [임베드 인증 시스템](#2-임베드-인증-시스템)
3. [테마 동기화](#3-테마-동기화)
4. [postMessage 통신 프로토콜](#4-postmessage-통신-프로토콜)
5. [Dashboard API 연동](#5-dashboard-api-연동)
6. [신규 모듈 통합 체크리스트](#6-신규-모듈-통합-체크리스트)
7. [환경 설정](#7-환경-설정)
8. [테스트 및 디버깅](#8-테스트-및-디버깅)
9. [FAQ](#9-faq)

---

## 1. 시스템 아키텍처 개요

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CampOne Dashboard                                │
│                   (Next.js 14 + App Router)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────────────────────────────────────────┐  │
│  │   Header    │  │                 iframe 영역                       │  │
│  │  (알림,유저) │  │                                                  │  │
│  ├─────────────┤  │   ┌────────────────────────────────────────────┐ │  │
│  │             │  │   │         외부 모듈 서비스                     │ │  │
│  │   Sidebar   │  │   │   (Insights, Policy, Hub, Studio, Ops)     │ │  │
│  │             │  │   │                                             │ │  │
│  │  - 모듈 메뉴 │  │   │   URL: /embed?token=xxx&theme=light        │ │  │
│  │  - 채널 링크 │  │   │                                             │ │  │
│  │  - 설정 메뉴 │  │   │   ← postMessage →                          │ │  │
│  │             │  │   └────────────────────────────────────────────┘ │  │
│  └─────────────┘  └──────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                              Footer                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
              ┌─────────┐    ┌─────────┐    ┌─────────┐
              │ Insights│    │ Policy  │    │   Hub   │
              │ Backend │    │ Backend │    │ Backend │
              └────┬────┘    └────┬────┘    └────┬────┘
                   │              │              │
                   └──────────────┼──────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │     Dashboard API            │
                    │  /api/activities             │
                    │  /api/alerts                 │
                    │  /api/kpi                    │
                    └─────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │      PostgreSQL (Prisma)     │
                    │  - users, alerts, audit_logs │
                    │  - kpi_cache, channel_links  │
                    └─────────────────────────────┘
```

### 1.2 기술 스택

| 구분 | Dashboard | 권장 모듈 스택 |
|------|-----------|--------------|
| 프레임워크 | Next.js 14 (App Router) | 자유 (React, Vue, Svelte 등) |
| 인증 | NextAuth.js (JWT) | JWT 검증 라이브러리 |
| 상태관리 | Zustand + TanStack Query | 자유 |
| UI | Tailwind CSS + Radix UI | Tailwind CSS 권장 (테마 호환) |
| DB | PostgreSQL + Prisma | 자유 |

### 1.3 현재 등록된 모듈

| 모듈 | 경로 | 설명 | URL |
|------|------|------|-----|
| Insights (M1) | `/pulse` | 여론 분석 · 트렌드 모니터링 | campone-v2-backend-*.run.app |
| Studio (M2) | `/studio` | 콘텐츠 제작 | (준비 중) |
| Policy Lab (M3) | `/policy` | 정책 관리 · 공약 로드맵 | campone-policy-*.run.app |
| Ops (M4) | `/ops` | 운영 관리 | (준비 중) |
| Civic Hub (M5) | `/hub` | 시민 소통 · Q&A 관리 | campone-civic-hub-*.run.app |

---

## 2. 임베드 인증 시스템

### 2.1 인증 흐름

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. 사용자가 Dashboard에 로그인 (NextAuth.js)                          │
│                                                                       │
│ 2. 모듈 페이지 접근 시                                                 │
│    Dashboard가 /api/auth/embed-token 호출                             │
│    → JWT 토큰 발급 (1시간 유효)                                        │
│                                                                       │
│ 3. iframe src에 토큰 포함                                              │
│    https://module-url/embed?token=xxx&theme=light                     │
│                                                                       │
│ 4. 모듈에서 토큰 검증                                                  │
│    → userId, email, name, role 추출                                   │
│                                                                       │
│ 5. 토큰 자동 갱신 (50분마다)                                           │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 JWT 토큰 구조

```typescript
// JWT Payload
interface EmbedTokenPayload {
  userId: string;       // 사용자 ID (cuid)
  email: string;        // 사용자 이메일
  name: string;         // 사용자 이름
  role: UserRole;       // 역할: "Admin" | "Manager" | "Staff" | "Viewer"
  source: "dashboard";  // 발급처
  iat: number;          // 발급 시각
  exp: number;          // 만료 시각 (1시간 후)
}

// 역할별 권한
type UserRole = "Admin" | "Manager" | "Staff" | "Viewer";
```

### 2.3 모듈에서 토큰 검증 (필수 구현)

**Node.js/TypeScript:**
```typescript
import jwt from 'jsonwebtoken';

const EMBED_JWT_SECRET = process.env.EMBED_JWT_SECRET;

interface EmbedTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  source: string;
}

export function verifyEmbedToken(token: string): EmbedTokenPayload | null {
  try {
    const decoded = jwt.verify(token, EMBED_JWT_SECRET!) as EmbedTokenPayload;

    if (decoded.source !== 'dashboard') {
      console.error('Invalid token source');
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// /embed 엔드포인트 구현 예시
app.get('/embed', (req, res) => {
  const { token, theme } = req.query;

  if (!token) {
    return res.status(401).send('Token required');
  }

  const payload = verifyEmbedToken(token as string);
  if (!payload) {
    return res.status(401).send('Invalid token');
  }

  // 사용자 정보를 세션/컨텍스트에 저장
  req.session.user = payload;
  req.session.theme = theme || 'light';

  // 앱 렌더링
  res.render('app', { user: payload, theme });
});
```

**Python (FastAPI):**
```python
import jwt
from fastapi import Query, HTTPException
from pydantic import BaseModel

EMBED_JWT_SECRET = os.environ.get("EMBED_JWT_SECRET")

class EmbedTokenPayload(BaseModel):
    userId: str
    email: str
    name: str
    role: str
    source: str

def verify_embed_token(token: str) -> EmbedTokenPayload:
    try:
        decoded = jwt.decode(token, EMBED_JWT_SECRET, algorithms=["HS256"])

        if decoded.get("source") != "dashboard":
            raise HTTPException(status_code=401, detail="Invalid token source")

        return EmbedTokenPayload(**decoded)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/embed")
async def embed_page(
    token: str = Query(..., description="JWT 토큰"),
    theme: str = Query("light", description="테마")
):
    payload = verify_embed_token(token)

    # 사용자 정보를 컨텍스트에 저장하고 앱 렌더링
    return templates.TemplateResponse("app.html", {
        "request": request,
        "user": payload.dict(),
        "theme": theme
    })
```

### 2.4 공유 시크릿 설정

**반드시 모듈과 Dashboard에서 동일한 시크릿 사용:**

```bash
# 모듈 서버 환경변수
EMBED_JWT_SECRET=<Dashboard와 동일한 값>
```

> **주의**: 시크릿은 Cloud Run Secret Manager에서 관리됩니다.
> 신규 모듈 배포 시 시크릿 공유가 필요합니다.

---

## 3. 테마 동기화

### 3.1 테마 전달 방식

Dashboard는 두 가지 방법으로 테마를 전달합니다:

1. **URL 파라미터 (초기 로드 시)**
   ```
   /embed?token=xxx&theme=light   // 또는 theme=dark
   ```

2. **postMessage (런타임 변경 시)**
   ```typescript
   // Dashboard → 모듈
   {
     type: 'THEME_CHANGE',
     source: 'Dashboard',
     timestamp: 1706234567890,
     payload: { theme: 'dark' }
   }
   ```

### 3.2 모듈에서 테마 처리 (필수 구현)

**React 예시:**
```typescript
// hooks/useThemeSync.ts
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export function useThemeSync(initialTheme: Theme = 'light') {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    // URL에서 초기 테마 읽기
    const params = new URLSearchParams(window.location.search);
    const urlTheme = params.get('theme') as Theme | null;
    if (urlTheme) {
      setTheme(urlTheme);
    }

    // postMessage 리스너
    const handleMessage = (event: MessageEvent) => {
      // Dashboard origin 확인
      if (event.data?.type === 'THEME_CHANGE' && event.data?.source === 'Dashboard') {
        const newTheme = event.data.payload?.theme as Theme;
        if (newTheme) {
          setTheme(newTheme);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 테마 적용
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return theme;
}
```

### 3.3 Tailwind CSS 테마 호환

Dashboard와 동일한 CSS 변수를 사용하면 테마가 자동 호환됩니다:

```css
/* globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}
```

---

## 4. postMessage 통신 프로토콜

### 4.1 메시지 타입

**모듈 → Dashboard:**
| 타입 | 용도 | 언제 사용 |
|------|------|----------|
| `READY` | 모듈 로드 완료 알림 | 앱 초기화 완료 시 |
| `ACTIVITY` | 사용자 활동 기록 | 버튼 클릭, 작업 수행 시 |
| `ALERT` | 알림 생성 | 주요 이벤트 발생 시 |
| `KPI_UPDATE` | KPI 데이터 갱신 | 데이터 변경 시 |
| `ERROR` | 에러 보고 | 오류 발생 시 |
| `NAVIGATION` | 페이지 이동 요청 | (예약됨) |

**Dashboard → 모듈:**
| 타입 | 용도 |
|------|------|
| `THEME_CHANGE` | 테마 변경 알림 |

### 4.2 메시지 형식

```typescript
// 모듈 → Dashboard 메시지
interface ModuleMessage {
  type: 'ACTIVITY' | 'ALERT' | 'KPI_UPDATE' | 'NAVIGATION' | 'ERROR' | 'READY';
  source: 'Insights' | 'Studio' | 'Policy' | 'Ops' | 'Hub';  // 모듈 이름
  timestamp: number;  // Date.now()
  payload: object;    // 타입별 페이로드
}

// Dashboard → 모듈 메시지
interface DashboardMessage {
  type: 'THEME_CHANGE';
  source: 'Dashboard';
  timestamp: number;
  payload: { theme: 'light' | 'dark' };
}
```

### 4.3 페이로드 상세

#### READY
```typescript
{
  type: 'READY',
  source: 'Policy',
  timestamp: Date.now(),
  payload: {
    version: '1.0.0'  // 선택
  }
}
```

#### ACTIVITY
```typescript
{
  type: 'ACTIVITY',
  source: 'Policy',
  timestamp: Date.now(),
  payload: {
    action: '공약 수정',           // 필수: 수행한 작업
    target: '청년 일자리 공약',     // 선택: 대상
    details: { pledgeId: 'abc' }   // 선택: 추가 정보
  }
}
```

#### ALERT
```typescript
{
  type: 'ALERT',
  source: 'Insights',
  timestamp: Date.now(),
  payload: {
    severity: 'warning',           // 필수: info, warning, error, success
    title: '여론 급증 감지',        // 필수: 제목
    message: 'SNS 멘션이 30% 증가', // 필수: 내용
    pinned: false,                 // 선택: 상단 고정
    expiresInMinutes: 60           // 선택: 만료 시간(분)
  }
}
```

#### KPI_UPDATE
```typescript
{
  type: 'KPI_UPDATE',
  source: 'Hub',
  timestamp: Date.now(),
  payload: {
    key: 'pending_questions',      // 필수: KPI 키
    value: 42,                     // 필수: 값
    unit: '건',                    // 선택: 단위
    change: -5.2                   // 선택: 변화율 (%)
  }
}
```

### 4.4 모듈에서 메시지 전송 (헬퍼 함수)

```typescript
// lib/dashboard-bridge.ts

type ModuleName = 'Insights' | 'Studio' | 'Policy' | 'Ops' | 'Hub';
type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

// 모듈 이름 설정 (앱 초기화 시 설정)
const MODULE_NAME: ModuleName = 'Policy';

function isInIframe(): boolean {
  return typeof window !== 'undefined' && window.parent !== window;
}

function sendToDashboard(type: string, payload: object): void {
  if (!isInIframe()) {
    console.warn('[Module] Not in iframe context');
    return;
  }

  const message = {
    type,
    source: MODULE_NAME,
    timestamp: Date.now(),
    payload,
  };

  window.parent.postMessage(message, '*');
  console.log(`[${MODULE_NAME}] Sent:`, message);
}

// 모듈 로드 완료 알림
export function notifyReady(version?: string): void {
  sendToDashboard('READY', { version });
}

// 활동 기록
export function logActivity(action: string, target?: string, details?: object): void {
  sendToDashboard('ACTIVITY', { action, target, details });
}

// 알림 생성
export function sendAlert(
  severity: AlertSeverity,
  title: string,
  message: string,
  options?: { pinned?: boolean; expiresInMinutes?: number }
): void {
  sendToDashboard('ALERT', {
    severity,
    title,
    message,
    ...options,
  });
}

// KPI 업데이트
export function updateKpi(
  key: string,
  value: number | string,
  unit?: string,
  change?: number
): void {
  sendToDashboard('KPI_UPDATE', { key, value, unit, change });
}

// 에러 보고
export function reportError(code: string, message: string, stack?: string): void {
  sendToDashboard('ERROR', { code, message, stack });
}
```

### 4.5 사용 예시

```typescript
// 앱 초기화 시
useEffect(() => {
  notifyReady('1.2.0');
}, []);

// 사용자 작업 시
const handleSave = async () => {
  await savePledge(data);
  logActivity('공약 저장', pledgeName, { pledgeId });
};

// 중요 이벤트 시
if (analysisComplete) {
  sendAlert('success', '분석 완료', '여론 분석이 완료되었습니다.');
}

// 에러 발생 시
try {
  await riskyOperation();
} catch (error) {
  reportError('ANALYSIS_FAILED', error.message, error.stack);
}
```

---

## 5. Dashboard API 연동

### 5.1 왜 API 호출이 필요한가?

postMessage는 iframe이 현재 페이지에 있을 때만 작동합니다.
서버에서 발생하는 백그라운드 이벤트(AI 분석 완료 등)는 사용자가 다른 페이지에 있을 수 있으므로 **서버 → Dashboard API** 직접 호출이 필요합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│  클라이언트 이벤트 (postMessage)  │  서버 이벤트 (API 호출)      │
├─────────────────────────────────────────────────────────────────┤
│  버튼 클릭                        │  AI 분석 완료                 │
│  문서 저장                        │  백그라운드 작업 완료          │
│  설정 변경                        │  스케줄된 알림                 │
│  → 사용자가 모듈 페이지에 있음     │  → 사용자 위치 알 수 없음      │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 API 인증

```typescript
// 모든 API 요청에 포함
const headers = {
  'Content-Type': 'application/json',
  'X-Service-Key': process.env.DASHBOARD_API_KEY
};
```

### 5.3 Activity API

**엔드포인트:** `POST /api/activities`

**Request:**
```typescript
{
  action: string;       // 필수. 활동 동작
  module: string;       // 필수. 모듈명 ("Insights" | "Policy" | "Hub" 등)
  target: string;       // 필수. 대상 (깔끔한 텍스트)
  details?: object;     // 선택. 추가 정보 (ID 등)
  userId?: string;      // 선택. 사용자 ID
  userName?: string;    // 선택. 사용자 이름
}
```

**action 키워드 → 배지 색상 매핑:**
| 키워드 | 색상 |
|--------|------|
| `실패`, `fail`, `error`, `오류` | 빨강 |
| `반려`, `거절`, `reject` | 빨강 |
| `생성`, `create`, `추가`, `등록`, `upload` | 초록 |
| `수정`, `update`, `변경`, `편집` | 파랑 |
| `삭제`, `delete`, `제거` | 빨강 |
| `승인`, `approve`, `완료` | 노랑 |
| `조회`, `download` | 회색 |

### 5.4 Alert API

**엔드포인트:** `POST /api/alerts`

**Request:**
```typescript
{
  type?: 'system' | 'workflow';  // 기본: system
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  source?: string;               // 모듈명
  pinned?: boolean;              // 상단 고정
  expiresAt?: string;            // ISO 8601 형식
  targetUserIds?: string[];      // 특정 사용자만 (없으면 전체)
}
```

### 5.5 KPI API

**엔드포인트:** `POST /api/kpi`

**Request:**
```typescript
{
  module: string;               // 모듈명
  key: string;                  // KPI 식별자
  value: number | string;       // 값
  unit?: string;                // 단위 (예: "점", "%", "건")
  change?: number;              // 변화율 (%)
  expiresInMinutes?: number;    // 만료 시간 (분, 기본: 60)
}
```

### 5.6 헬퍼 함수 (서버용)

```typescript
// lib/dashboard-api.ts

const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL;
const DASHBOARD_API_KEY = process.env.DASHBOARD_API_KEY;

async function callDashboardApi(endpoint: string, body: object): Promise<void> {
  try {
    const response = await fetch(`${DASHBOARD_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': DASHBOARD_API_KEY!,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`Dashboard API error: ${response.status}`);
    }
  } catch (error) {
    // Dashboard 알림은 부가 기능이므로 에러 로깅만
    console.error('Dashboard API call failed:', error);
  }
}

export async function logActivity(
  action: string,
  module: string,
  target: string,
  details?: object
): Promise<void> {
  await callDashboardApi('/api/activities', {
    action,
    module,
    target,
    details,
    userName: `${module} System`,
  });
}

export async function sendAlert(
  severity: string,
  title: string,
  message: string,
  source: string,
  pinned = false
): Promise<void> {
  await callDashboardApi('/api/alerts', {
    type: 'workflow',
    severity,
    title,
    message,
    source,
    pinned,
  });
}

export async function sendKpi(
  module: string,
  key: string,
  value: number | string,
  unit?: string,
  change?: number
): Promise<void> {
  await callDashboardApi('/api/kpi', {
    module,
    key,
    value,
    unit,
    change,
    expiresInMinutes: 120,
  });
}
```

**Python (FastAPI) 헬퍼:**

```python
# lib/dashboard_api.py

import os
import httpx
from typing import Optional, Dict, Any

DASHBOARD_API_URL = os.environ.get("DASHBOARD_API_URL")
DASHBOARD_API_KEY = os.environ.get("DASHBOARD_API_KEY")

async def call_dashboard_api(endpoint: str, body: dict) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DASHBOARD_API_URL}{endpoint}",
            json=body,
            headers={
                "Content-Type": "application/json",
                "X-Service-Key": DASHBOARD_API_KEY,
            },
            timeout=10.0
        )
        response.raise_for_status()
        return response.json()

async def log_activity(
    action: str,
    module: str,
    target: str,
    details: Optional[Dict[str, Any]] = None,
    user_name: Optional[str] = None
):
    await call_dashboard_api("/api/activities", {
        "action": action,
        "module": module,
        "target": target,
        "details": details,
        "userName": user_name or f"{module} System",
    })

async def send_alert(
    severity: str,
    title: str,
    message: str,
    source: str,
    pinned: bool = False
):
    await call_dashboard_api("/api/alerts", {
        "type": "workflow",
        "severity": severity,
        "title": title,
        "message": message,
        "source": source,
        "pinned": pinned,
    })

async def send_kpi(
    module: str,
    key: str,
    value: float | int | str,
    unit: Optional[str] = None,
    change: Optional[float] = None
):
    await call_dashboard_api("/api/kpi", {
        "module": module,
        "key": key,
        "value": value,
        "unit": unit,
        "change": change,
        "expiresInMinutes": 120,
    })
```

---

## 6. 신규 모듈 통합 체크리스트

### 6.1 Dashboard팀에게 요청할 것

| 항목 | 설명 | 필수 |
|------|------|:----:|
| 사이드바 등록 | 모듈 메뉴 추가 (아이콘, 라벨, 경로) | O |
| 모듈 페이지 생성 | `/app/(modules)/[name]/page.tsx` | O |
| Origin 허용 | `module-protocol.ts`에 URL 추가 | O |
| EMBED_JWT_SECRET 공유 | Secret Manager에서 값 공유 | O |
| DASHBOARD_API_KEY 발급 | 서버 간 통신용 API 키 | O |
| 모듈 타입 등록 | `types.ts`의 ModuleName에 추가 | - |

**Dashboard팀에게 전달할 정보:**
```yaml
모듈 정보:
  이름: "NewModule"
  표시명: "새 모듈"
  설명: "새 모듈 설명"
  경로: "/new-module"
  아이콘: "lucide-react 아이콘 이름"
  배지: "M6" (또는 빈 문자열)

서비스 URL:
  프로덕션: https://campone-new-module-xxx.asia-northeast3.run.app
  개발: http://localhost:3006
```

### 6.2 모듈에서 구현할 것

| 항목 | 설명 | 필수 |
|------|------|:----:|
| `/embed` 엔드포인트 | 토큰 검증 + 앱 렌더링 | O |
| JWT 토큰 검증 | EMBED_JWT_SECRET 사용 | O |
| 테마 동기화 | URL + postMessage 처리 | O |
| READY 알림 | 앱 로드 완료 시 postMessage | O |
| CORS 설정 | Dashboard origin 허용 | O |
| ACTIVITY 전송 | 사용자 활동 기록 | 권장 |
| ALERT 전송 | 주요 이벤트 알림 | 권장 |
| KPI 전송 | 지표 데이터 갱신 | - |
| 서버 API 호출 | 백그라운드 이벤트 처리 | 권장 |

### 6.3 통합 테스트 체크리스트

- [ ] `/embed?token=xxx&theme=light` 접근 시 정상 렌더링
- [ ] 토큰 없이 접근 시 401 에러
- [ ] 만료된 토큰으로 접근 시 401 에러
- [ ] Dashboard에서 iframe 로드 정상 확인
- [ ] READY 메시지 수신 확인 (브라우저 콘솔)
- [ ] 테마 변경 시 모듈에 반영 확인
- [ ] Activity 전송 후 Dashboard 최근활동에 표시 확인
- [ ] Alert 전송 후 Dashboard 헤더 알림에 표시 확인
- [ ] 서버 API 호출 후 DB 저장 확인

---

## 7. 환경 설정

### 7.1 모듈 서버 환경변수

```bash
# .env 또는 Cloud Run 환경변수

# 임베드 인증 (필수)
EMBED_JWT_SECRET=<Dashboard와 동일한 값>

# Dashboard API 호출 (서버 이벤트용)
DASHBOARD_API_URL=https://campone-dashboard-755458598444.asia-northeast3.run.app
DASHBOARD_API_KEY=<발급받은 API 키>

# 로컬 개발
# DASHBOARD_API_URL=http://localhost:3000
```

### 7.2 Cloud Run 배포 시

```bash
# Secret Manager 시크릿 연결
gcloud run deploy my-module \
  --image gcr.io/PROJECT/my-module \
  --set-secrets=EMBED_JWT_SECRET=campone-embed-jwt-secret:latest \
  --set-secrets=DASHBOARD_API_KEY=campone-dashboard-api-key:latest \
  --set-env-vars=DASHBOARD_API_URL=https://campone-dashboard-xxx.run.app
```

### 7.3 CORS 설정

모듈 서버에서 Dashboard origin 허용:

```typescript
// Next.js API Route
export async function GET(request: NextRequest) {
  const response = NextResponse.json({ data });

  response.headers.set('Access-Control-Allow-Origin', 'https://campone-dashboard-xxx.run.app');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

// Express.js
app.use(cors({
  origin: [
    'https://campone-dashboard-755458598444.asia-northeast3.run.app',
    'http://localhost:3000',  // 로컬 개발
  ],
  credentials: true,
}));
```

---

## 8. 테스트 및 디버깅

### 8.1 로컬 개발 환경

1. **Dashboard 로컬 실행:**
   ```bash
   cd campone-dashboard
   npm run dev  # http://localhost:3000
   ```

2. **모듈 로컬 실행:**
   ```bash
   cd my-module
   npm run dev  # http://localhost:3001
   ```

3. **모듈 URL 임시 변경:**
   Dashboard의 모듈 페이지에서 URL 상수를 localhost로 변경

### 8.2 브라우저 콘솔 디버깅

```javascript
// Dashboard 콘솔에서 확인
// [Dashboard] Module Policy is ready
// [Dashboard] Received from Policy: {...}

// 모듈 콘솔에서 확인
// [Policy] Sent: {type: 'READY', ...}
// [Policy] Sent: {type: 'ACTIVITY', ...}
```

### 8.3 API 테스트 (curl)

```bash
# Activity 테스트
curl -X POST https://campone-dashboard-xxx.run.app/api/activities \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: YOUR_API_KEY" \
  -d '{
    "action": "테스트 활동",
    "module": "Test",
    "target": "테스트 대상"
  }'

# Alert 테스트
curl -X POST https://campone-dashboard-xxx.run.app/api/alerts \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: YOUR_API_KEY" \
  -d '{
    "severity": "info",
    "title": "테스트 알림",
    "message": "테스트 메시지",
    "source": "Test"
  }'
```

### 8.4 일반적인 문제 해결

| 문제 | 원인 | 해결 |
|------|------|------|
| iframe 빈 화면 | 토큰 검증 실패 | EMBED_JWT_SECRET 확인 |
| CORS 에러 | Origin 미허용 | module-protocol.ts 확인 |
| 테마 미적용 | CSS 변수 누락 | 테마 CSS 확인 |
| 메시지 미수신 | isValidModuleMessage 실패 | 메시지 형식 확인 |
| API 401 에러 | API 키 잘못됨 | X-Service-Key 확인 |

---

## 9. FAQ

**Q: 모듈에서 사용자 정보는 어떻게 얻나요?**
A: JWT 토큰에서 `userId`, `email`, `name`, `role`을 추출하세요.

**Q: postMessage와 API 둘 다 사용해야 하나요?**
A: 네. 클라이언트 이벤트는 postMessage, 서버 이벤트는 API로 분리하세요.

**Q: 토큰이 만료되면 어떻게 되나요?**
A: Dashboard가 50분마다 자동 갱신합니다. 모듈은 갱신된 토큰을 URL에서 다시 받습니다.

**Q: 역할별 권한 처리는 모듈에서 해야 하나요?**
A: 네. 토큰의 `role` 값을 확인해서 모듈 내에서 권한을 제어하세요.

**Q: KPI는 어디에 표시되나요?**
A: Dashboard 메인 페이지 또는 각 모듈 카드에 표시됩니다 (구현에 따라 다름).

**Q: 로컬에서 테스트할 때 localhost 허용은 자동인가요?**
A: 네. `ALLOWED_ORIGINS`에 localhost가 포함되어 있고, 검증 로직에서도 localhost는 허용합니다.

---

## 10. 문의

- **Dashboard 연동**: (담당자)
- **시크릿/API 키 발급**: (담당자)
- **GitHub Issues**: https://github.com/xxx/campone-dashboard/issues

---

*문서 버전: 3.0*
*최종 수정: 2026-01-25*
