# CampOne — 역할(RBAC) 체계 가이드

각 서비스(Insight, Studio, Ops 등)에서 사용자 역할을 참조할 때 필요한 정보를 정리합니다.

---

## 1. 권한 구조

CampOne은 **2단계 권한 체계**를 사용합니다.

```
┌──────────────────────────────────────────────┐
│  시스템 레벨 (Control 전용)                   │
│  └─ isSystemAdmin: boolean                   │
│     → Control 관리 콘솔 접근 권한             │
│     → 개별 서비스와 무관                      │
├──────────────────────────────────────────────┤
│  테넌트 레벨 (서비스에서 참조)                │
│  └─ user_tenants.role: string                │
│     → 캠프(테넌트) 내 역할                   │
│     → 서비스별 기능 접근 제어에 활용          │
└──────────────────────────────────────────────┘
```

- **시스템 관리자(`isSystemAdmin`)**: Control 관리 콘솔 전용. 개별 서비스에서는 참조하지 않음.
- **테넌트 역할(`role`)**: 해당 캠프 내에서의 권한 수준. 서비스에서 기능 접근 제어에 활용.

---

## 2. 역할 목록

권한 수준 기반 3단계:

| 값 | 한글명 | 설명 |
|----|--------|------|
| `admin` | 관리자 | 캠프 내 모든 권한 (설정 포함) |
| `editor` | 편집자 | 데이터 생성 및 수정 가능 |
| `viewer` | 뷰어 | 읽기 전용 (기본값) |

**권한 포함 관계**: `admin` ⊃ `editor` ⊃ `viewer`

- `admin`은 `editor`가 할 수 있는 모든 것 + 설정/삭제
- `editor`는 `viewer`가 할 수 있는 모든 것 + 생성/수정

---

## 3. 데이터 소스

### 테이블: `user_tenants` (시스템 DB: `campone_system`)

```sql
CREATE TABLE user_tenants (
  user_id    UUID        NOT NULL,
  tenant_id  VARCHAR(50) NOT NULL,
  role       VARCHAR(50) NOT NULL DEFAULT 'viewer',
  is_default BOOLEAN     NOT NULL DEFAULT false,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);
```

한 사용자가 여러 캠프에 소속될 수 있으며, 캠프마다 다른 역할을 가질 수 있습니다.

### 역할 관리 주체

| 구분 | 주체 |
|------|------|
| 역할 정의 (어떤 역할이 있는지) | Control |
| 역할 할당/변경 (누가 어떤 역할인지) | Control |
| 역할 참조 (접근 제어에 활용) | 각 서비스 |

서비스가 역할을 임의로 변경해서는 안 됩니다.

---

## 4. 서비스에서 역할 조회

### 방법 A: 시스템 DB 직접 조회 (권장)

```sql
SELECT role FROM user_tenants
WHERE user_id = $1 AND tenant_id = $2;
```

### 방법 B: JWT 토큰에 포함

로그인 시점에 역할을 조회하여 토큰에 포함:

```typescript
const mapping = await systemDb.query(
  'SELECT role FROM user_tenants WHERE user_id = $1 AND tenant_id = $2',
  [userId, tenantId]
);
const role = mapping?.role ?? 'viewer';
const token = jwt.sign({ userId, tenantId, role }, secret);
```

---

## 5. 서비스에서 접근 제어 예시

```typescript
// 역할 상수
type Role = 'admin' | 'editor' | 'viewer';

// 권한 포함 관계 체크
const ROLE_LEVEL: Record<Role, number> = { admin: 3, editor: 2, viewer: 1 };

function hasPermission(userRole: string, requiredRole: Role): boolean {
  return (ROLE_LEVEL[userRole as Role] ?? 0) >= ROLE_LEVEL[requiredRole];
}

// 사용 예시
hasPermission('admin', 'editor');   // true  (admin ⊃ editor)
hasPermission('editor', 'viewer');  // true  (editor ⊃ viewer)
hasPermission('viewer', 'editor');  // false
```

### 미들웨어 예시

```typescript
function requireRole(minRole: Role) {
  return (req, res, next) => {
    if (!hasPermission(req.user.role, minRole)) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }
    next();
  };
}

app.get('/api/reports', requireRole('viewer'), getReports);       // 모든 역할 접근 가능
app.post('/api/content', requireRole('editor'), createContent);   // editor, admin만
app.delete('/api/settings', requireRole('admin'), deleteSettings); // admin만
```

---

## 6. 역할별 접근 범위 (권장)

| 기능 | admin | editor | viewer |
|------|:-----:|:------:|:------:|
| 데이터 조회 | O | O | O |
| 대시보드 열람 | O | O | O |
| 데이터 생성/수정 | O | O | - |
| 콘텐츠 제작 | O | O | - |
| 분석 실행 | O | O | - |
| 캠프 설정 변경 | O | - | - |
| 사용자 관리 (캠프 내) | O | - | - |
| 서비스 연동 설정 | O | - | - |

각 서비스에서 세부 조정 가능하지만, 위 표를 기본 기준으로 합니다.

---

## 7. 주의사항

1. **역할 값은 3개만**: `admin`, `editor`, `viewer`. 추가 필요 시 Control에서 정의 후 전파.
2. **알 수 없는 역할은 `viewer` 취급**: DB에 없는 값이면 최소 권한으로 처리.
3. **한 유저, 여러 캠프**: 같은 사용자가 캠프 A에서는 `admin`, 캠프 B에서는 `viewer`일 수 있음.
4. **`isSystemAdmin`과 `role`은 별개**: 시스템 관리자라고 해서 특정 캠프 내 admin은 아님.
5. **서비스가 역할을 변경하지 않음**: 역할 할당은 Control에서만 수행.
