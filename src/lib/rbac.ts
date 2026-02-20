/**
 * CampOne 관리자 대시보드 - RBAC (Role-Based Access Control)
 * v2.0: 3단계 역할 체계 (admin ⊃ editor ⊃ viewer)
 *
 * @see docs/RBAC_GUIDE.md
 */

import type { UserRole } from './types';

/** 역할 레벨 (숫자가 높을수록 더 많은 권한) */
const ROLE_LEVEL: Record<UserRole, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
};

/**
 * 사용자 역할이 요구 역할 이상인지 확인
 * admin ⊃ editor ⊃ viewer (포함 관계)
 */
export function hasPermission(userRole: string, requiredRole: UserRole): boolean {
  return (ROLE_LEVEL[userRole as UserRole] ?? 0) >= ROLE_LEVEL[requiredRole];
}

/**
 * 편집 권한 (editor 이상)
 */
export function canEdit(role: string): boolean {
  return hasPermission(role, 'editor');
}

/**
 * 관리 권한 (admin만)
 */
export function isAdmin(role: string): boolean {
  return hasPermission(role, 'admin');
}

/**
 * 역할별 한글 레이블
 */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: '관리자',
    editor: '편집자',
    viewer: '뷰어',
  };
  return labels[role] || role;
}

/**
 * 알 수 없는 역할을 viewer로 정규화
 */
export function normalizeRole(role: string | undefined | null): UserRole {
  if (role && role in ROLE_LEVEL) return role as UserRole;
  return 'viewer';
}
