# [공지] CampOne Dashboard 모듈 연동 안내

> 발신: Dashboard 팀
> 수신: Insights, Studio, Policy, Ops, Civic Hub 개발팀
> 일자: 2026-01-26

---

## 1. 현황

Dashboard에서 각 모듈을 iframe으로 임베드하여 통합 운영 중입니다.
현재 **테마 동기화** 및 **KPI 데이터 연동** 기능이 추가되어 각 모듈의 대응이 필요합니다.

---

## 2. 필수 적용 사항

### 2.1 테마 실시간 동기화 (신규)

Dashboard에서 라이트/다크 모드 전환 시 iframe에 메시지가 전송됩니다.
**각 모듈에서 수신 로직 구현이 필요합니다.**

```typescript
// 앱 초기화 시 이벤트 리스너 등록
window.addEventListener('message', (event) => {
  // Dashboard에서 오는 테마 변경 메시지 처리
  if (event.data?.type === 'THEME_CHANGE' && event.data?.source === 'Dashboard') {
    const newTheme = event.data.payload.theme; // 'light' | 'dark'

    // 예시: document class 변경
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);

    // 또는 상태 관리 라이브러리 사용
    // setTheme(newTheme);
  }
});
```

### 2.2 초기 테마 적용

임베드 URL에 `theme` 파라미터가 포함됩니다.

```
/embed?token=xxx&theme=light
/embed?token=xxx&theme=dark
```

앱 초기화 시 URL 파라미터를 읽어 테마를 적용해주세요.

```typescript
// 초기 로드 시
const urlParams = new URLSearchParams(window.location.search);
const initialTheme = urlParams.get('theme') || 'light';
applyTheme(initialTheme);
```

---

## 3. 권장 적용 사항 (KPI 연동)

Dashboard 메인 화면에 각 모듈의 KPI가 표시됩니다.
주요 지표를 전송해주시면 실시간으로 반영됩니다.

### 3.1 KPI 전송 예시

```typescript
// 분석 완료, 콘텐츠 발행 등 주요 이벤트 발생 시
window.parent.postMessage({
  type: 'KPI_UPDATE',
  source: 'Studio',  // 모듈명: 'Insights' | 'Studio' | 'Policy' | 'Ops' | 'Hub'
  timestamp: Date.now(),
  payload: {
    key: 'published_content',  // KPI 키
    value: 45,                  // 값
    unit: '건',                 // 단위 (선택)
    change: 3,                  // 변화량 (선택)
  }
}, '*');
```

### 3.2 모듈별 권장 KPI

| 모듈 | Key | 설명 |
|------|-----|------|
| **Insights** | `support_score` | 지지도 점수 |
| **Insights** | `positive_ratio` | 긍정 여론 비율 |
| **Studio** | `published_content` | 발행 콘텐츠 수 |
| **Policy** | `overallProgress` | 분석 진행률 |
| **Ops** | `checklist_progress` | 체크리스트 진행률 |
| **Hub** | `total_questions` | 시민 질문 수 |

---

## 4. 참고 정보

### JWT 인증

| 항목 | 값 |
|------|-----|
| Secret | `campone-embed-secret-change-in-production` |
| 토큰 위치 | URL 파라미터 `token` |

### CORS 허용 필요

```
https://campone-dashboard-755458598444.asia-northeast3.run.app
```

### 상세 문서

- GitHub: `docs/MODULE_EMBED_STATUS.md`
- GitHub: `docs/MODULE_INTEGRATION_GUIDE.md`
- GitHub: `docs/KPI_INTEGRATION_GUIDE.md`

---

## 5. 문의

연동 관련 이슈나 질문은 Dashboard 팀으로 문의 바랍니다.

---

**요약:**
1. ✅ 테마 변경 메시지 수신 로직 추가 (필수)
2. ✅ 초기 테마 URL 파라미터 처리 (필수)
3. 📊 KPI 데이터 전송 (권장)
