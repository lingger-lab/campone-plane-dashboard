# 프로덕션 배포 체크리스트

> 배포 전 반드시 확인해야 할 항목들

---

## 1. 시크릿 및 환경변수

### 1.1 EMBED_JWT_SECRET (임베드 인증용)

- [ ] **강력한 시크릿 생성**
  ```bash
  openssl rand -base64 32
  ```

- [ ] **Secret Manager에 저장**
  ```bash
  echo -n "생성된_시크릿_값" | gcloud secrets create embed-jwt-secret --data-file=-
  ```

- [ ] **모든 서비스에 동일한 값 적용**
  | 서비스 | 명령어 |
  |--------|--------|
  | Dashboard | `gcloud run services update campone-dashboard --set-secrets=EMBED_JWT_SECRET=embed-jwt-secret:latest` |
  | Insights | `gcloud run services update campone-v2-backend --set-secrets=EMBED_JWT_SECRET=embed-jwt-secret:latest` |
  | Civic Hub | `gcloud run services update campone-civic-hub --set-secrets=EMBED_JWT_SECRET=embed-jwt-secret:latest` |
  | Policy Lab | `gcloud run services update campone-policy --set-secrets=EMBED_JWT_SECRET=embed-jwt-secret:latest` |

### 1.2 NEXTAUTH_SECRET

- [ ] 프로덕션용 강력한 값으로 변경
  ```bash
  openssl rand -base64 32
  ```

### 1.3 DATABASE_URL

- [ ] 프로덕션 DB 연결 문자열 확인
- [ ] SSL 모드 적절히 설정 (`sslmode=require` 권장)

---

## 2. 서비스별 통합 확인

### 2.1 Insights (campone-v2)

- [ ] `/embed` 라우트 구현 완료
- [ ] CORS origin에 Dashboard URL 추가
- [ ] 쿠키 SameSite=None 설정

### 2.2 Civic Hub

- [ ] `/embed` 라우트 구현 완료
- [ ] 미들웨어에 embed_session 검사 추가
- [ ] 쿠키 SameSite=None 설정

### 2.3 Policy Lab

- [ ] `/embed` 라우트 구현 완료
- [ ] requireUserId() 헬퍼 수정
- [ ] 쿠키 SameSite=None 설정

---

## 3. 배포 순서

1. **Secret Manager에 공유 시크릿 생성** (한 번만)
2. **각 서비스 코드 배포** (순서 무관)
   - Dashboard
   - Insights
   - Civic Hub
   - Policy Lab
3. **통합 테스트**
   - Dashboard 로그인
   - 각 모듈 탭에서 iframe 로드 확인
   - 인증 상태 유지 확인

---

## 4. 롤백 계획

문제 발생 시:

1. 각 서비스를 이전 버전으로 롤백
   ```bash
   gcloud run services update-traffic SERVICE_NAME --to-revisions=PREVIOUS_REVISION=100
   ```

2. iframe 대신 직접 URL로 fallback (토큰 없이 접근)

---

## 5. 현재 로컬 개발용 값 (참고용)

```bash
# 이 값들은 프로덕션에서 절대 사용하지 말 것!
EMBED_JWT_SECRET=campone-embed-secret-change-in-production
NEXTAUTH_SECRET=campone-demo-secret-key-change-in-production
```

---

*최종 수정: 2026-01-23*