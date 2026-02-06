/**
 * CampOne 관리자 대시보드 - RBAC (Role-Based Access Control)
 * v1.4: user_tenants.role 기반
 */

import type { UserRole, Permission } from './types';

// 모든 역할
const ALL: UserRole[] = ['admin', 'analyst', 'operator', 'content_manager', 'civichub_admin', 'member'];
// 관리 + 전문 역할
const MANAGERS: UserRole[] = ['admin', 'analyst', 'operator', 'content_manager'];

/**
 * 권한 매트릭스 정의
 *
 * admin: 모든 권한
 * analyst: Insight, Policy 관련
 * operator: Ops 관련
 * content_manager: Studio 관련
 * civichub_admin: CivicHub 관련
 * member: 읽기 전용
 */
export const permissions: Permission[] = [
  // Contacts/Segments
  { entity: 'contacts', action: 'read', roles: ALL },
  { entity: 'contacts', action: 'create', roles: MANAGERS },
  { entity: 'contacts', action: 'update', roles: MANAGERS },
  { entity: 'contacts', action: 'delete', roles: ['admin'] },

  { entity: 'segments', action: 'read', roles: ALL },
  { entity: 'segments', action: 'create', roles: MANAGERS },
  { entity: 'segments', action: 'update', roles: ['admin', 'analyst'] },
  { entity: 'segments', action: 'delete', roles: ['admin'] },

  // Messages/Campaigns
  { entity: 'messages', action: 'read', roles: ALL },
  { entity: 'messages', action: 'create', roles: MANAGERS },
  { entity: 'messages', action: 'update', roles: MANAGERS },
  { entity: 'messages', action: 'delete', roles: ['admin'] },
  { entity: 'messages', action: 'send', roles: ['admin', 'operator'] },

  { entity: 'campaigns', action: 'read', roles: ALL },
  { entity: 'campaigns', action: 'create', roles: MANAGERS },
  { entity: 'campaigns', action: 'update', roles: ['admin', 'operator'] },
  { entity: 'campaigns', action: 'delete', roles: ['admin'] },

  // Events
  { entity: 'events', action: 'read', roles: ALL },
  { entity: 'events', action: 'create', roles: ['admin', 'operator'] },
  { entity: 'events', action: 'update', roles: ['admin', 'operator'] },
  { entity: 'events', action: 'delete', roles: ['admin'] },

  // Donations
  { entity: 'donations', action: 'read', roles: ALL },
  { entity: 'donations', action: 'create', roles: ['admin', 'operator'] },
  { entity: 'donations', action: 'update', roles: ['admin'] },
  { entity: 'donations', action: 'delete', roles: ['admin'] },

  // Tasks
  { entity: 'tasks', action: 'read', roles: ALL },
  { entity: 'tasks', action: 'create', roles: MANAGERS },
  { entity: 'tasks', action: 'update', roles: MANAGERS },
  { entity: 'tasks', action: 'delete', roles: ['admin'] },

  // Policy Docs
  { entity: 'policy', action: 'read', roles: ALL },
  { entity: 'policy', action: 'create', roles: ['admin', 'analyst'] },
  { entity: 'policy', action: 'update', roles: ['admin', 'analyst'] },
  { entity: 'policy', action: 'approve', roles: ['admin'] },
  { entity: 'policy', action: 'delete', roles: ['admin'] },

  // Studio
  { entity: 'studio', action: 'read', roles: ALL },
  { entity: 'studio', action: 'create', roles: ['admin', 'content_manager'] },
  { entity: 'studio', action: 'update', roles: ['admin', 'content_manager'] },
  { entity: 'studio', action: 'approve', roles: ['admin'] },
  { entity: 'studio', action: 'delete', roles: ['admin'] },

  // Ops Runbook
  { entity: 'ops', action: 'read', roles: ALL },
  { entity: 'ops', action: 'create', roles: ['admin', 'operator'] },
  { entity: 'ops', action: 'update', roles: ['admin', 'operator'] },
  { entity: 'ops', action: 'delete', roles: ['admin'] },

  // Roles & Permissions
  { entity: 'roles', action: 'read', roles: ['admin'] },
  { entity: 'roles', action: 'create', roles: ['admin'] },
  { entity: 'roles', action: 'update', roles: ['admin'] },
  { entity: 'roles', action: 'delete', roles: ['admin'] },

  // Audit Log
  { entity: 'audit', action: 'read', roles: ALL },

  // Settings
  { entity: 'settings', action: 'read', roles: ALL },
  { entity: 'settings', action: 'update', roles: ['admin'] },

  // Channels
  { entity: 'channels', action: 'read', roles: ALL },
  { entity: 'channels', action: 'update', roles: ['admin'] },

  // Quick Buttons
  { entity: 'quickButtons', action: 'read', roles: ALL },
  { entity: 'quickButtons', action: 'create', roles: ['admin'] },
  { entity: 'quickButtons', action: 'update', roles: ['admin'] },
  { entity: 'quickButtons', action: 'delete', roles: ['admin'] },
];

/**
 * 사용자가 특정 권한을 가지고 있는지 확인
 */
export function hasPermission(
  role: UserRole,
  entity: string,
  action: Permission['action']
): boolean {
  const permission = permissions.find(
    (p) => p.entity === entity && p.action === action
  );

  if (!permission) return false;

  return permission.roles.includes(role);
}

/**
 * 역할별 레이블
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: '관리자',
    analyst: '분석가',
    operator: '운영 담당',
    content_manager: '콘텐츠 담당',
    civichub_admin: 'CivicHub 관리',
    member: '멤버',
  };

  return labels[role] || role;
}

/**
 * 특정 엔터티에 대한 사용자의 모든 권한 조회
 */
export function getEntityPermissions(
  role: UserRole,
  entity: string
): Permission['action'][] {
  return permissions
    .filter((p) => p.entity === entity && p.roles.includes(role))
    .map((p) => p.action);
}

/**
 * 사용자가 CRUD 권한을 모두 가지고 있는지 확인
 */
export function hasFullCRUD(role: UserRole, entity: string): boolean {
  const actions: Permission['action'][] = ['create', 'read', 'update', 'delete'];
  return actions.every((action) => hasPermission(role, entity, action));
}

/**
 * 권한 체크 훅용 타입
 */
export type PermissionCheck = {
  can: (action: Permission['action'], entity: string) => boolean;
  canApprove: (entity: string) => boolean;
};

/**
 * 권한 체크 객체 생성
 */
export function createPermissionChecker(role: UserRole): PermissionCheck {
  return {
    can: (action, entity) => hasPermission(role, entity, action),
    canApprove: (entity) => hasPermission(role, entity, 'approve'),
  };
}
