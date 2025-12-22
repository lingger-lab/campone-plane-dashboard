/**
 * CampOne 관리자 대시보드 - RBAC (Role-Based Access Control)
 */

import type { UserRole, Permission } from './types';

/**
 * 권한 매트릭스 정의
 *
 * Admin: 모든 권한
 * Manager: 대부분 권한 (역할/권한 관리 제외)
 * Staff: 제한된 권한 (승인 필요)
 * Viewer: 읽기 전용
 */
export const permissions: Permission[] = [
  // Contacts/Segments
  { entity: 'contacts', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'contacts', action: 'create', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'contacts', action: 'update', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'contacts', action: 'delete', roles: ['Admin', 'Manager'] },

  { entity: 'segments', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'segments', action: 'create', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'segments', action: 'update', roles: ['Admin', 'Manager'] },
  { entity: 'segments', action: 'delete', roles: ['Admin', 'Manager'] },

  // Messages/Campaigns
  { entity: 'messages', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'messages', action: 'create', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'messages', action: 'update', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'messages', action: 'delete', roles: ['Admin', 'Manager'] },
  { entity: 'messages', action: 'send', roles: ['Admin', 'Manager'] }, // Staff는 승인 필요

  { entity: 'campaigns', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'campaigns', action: 'create', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'campaigns', action: 'update', roles: ['Admin', 'Manager'] },
  { entity: 'campaigns', action: 'delete', roles: ['Admin', 'Manager'] },

  // Events
  { entity: 'events', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'events', action: 'create', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'events', action: 'update', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'events', action: 'delete', roles: ['Admin', 'Manager'] },

  // Donations
  { entity: 'donations', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'donations', action: 'create', roles: ['Admin', 'Manager'] },
  { entity: 'donations', action: 'update', roles: ['Admin', 'Manager'] },
  { entity: 'donations', action: 'delete', roles: ['Admin'] },

  // Tasks
  { entity: 'tasks', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'tasks', action: 'create', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'tasks', action: 'update', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'tasks', action: 'delete', roles: ['Admin', 'Manager'] },

  // Policy Docs
  { entity: 'policy', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'policy', action: 'create', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'policy', action: 'update', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'policy', action: 'approve', roles: ['Admin', 'Manager'] },
  { entity: 'policy', action: 'delete', roles: ['Admin', 'Manager'] },

  // Studio
  { entity: 'studio', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'studio', action: 'create', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'studio', action: 'update', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'studio', action: 'approve', roles: ['Admin', 'Manager'] }, // 퍼블리시 승인
  { entity: 'studio', action: 'delete', roles: ['Admin', 'Manager'] },

  // Ops Runbook
  { entity: 'ops', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'ops', action: 'create', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'ops', action: 'update', roles: ['Admin', 'Manager'] }, // Staff는 제안만
  { entity: 'ops', action: 'delete', roles: ['Admin', 'Manager'] },

  // Roles & Permissions
  { entity: 'roles', action: 'read', roles: ['Admin'] },
  { entity: 'roles', action: 'create', roles: ['Admin'] },
  { entity: 'roles', action: 'update', roles: ['Admin'] },
  { entity: 'roles', action: 'delete', roles: ['Admin'] },

  // Audit Log
  { entity: 'audit', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },

  // Settings
  { entity: 'settings', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'settings', action: 'update', roles: ['Admin', 'Manager'] },

  // Channels
  { entity: 'channels', action: 'read', roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'channels', action: 'update', roles: ['Admin', 'Manager'] },
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
 * 사용자가 승인이 필요한지 확인
 */
export function needsApproval(role: UserRole, entity: string, action: Permission['action']): boolean {
  // Staff가 메시지 발송 시 승인 필요
  if (role === 'Staff' && entity === 'messages' && action === 'send') {
    return true;
  }

  // Staff가 Studio 퍼블리시 시 검토 필요
  if (role === 'Staff' && entity === 'studio' && action === 'approve') {
    return true;
  }

  return false;
}

/**
 * 역할별 레이블
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    Admin: '관리자',
    Manager: '매니저',
    Staff: '스태프',
    Viewer: '뷰어',
  };

  return labels[role];
}

/**
 * 역할별 설명
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    Admin: '모든 기능에 대한 전체 권한',
    Manager: '역할/권한 관리를 제외한 대부분의 권한',
    Staff: '제한된 생성/수정 권한 (일부 작업은 승인 필요)',
    Viewer: '읽기 전용 권한',
  };

  return descriptions[role];
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
  needsApproval: (action: Permission['action'], entity: string) => boolean;
};

/**
 * 권한 체크 객체 생성
 */
export function createPermissionChecker(role: UserRole): PermissionCheck {
  return {
    can: (action, entity) => hasPermission(role, entity, action),
    canApprove: (entity) => hasPermission(role, entity, 'approve'),
    needsApproval: (action, entity) => needsApproval(role, entity, action),
  };
}
