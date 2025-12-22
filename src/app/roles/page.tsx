'use client';

import React from 'react';
import { Shield, Check, X, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Permission = 'full' | 'limited' | 'view' | 'none';

interface RolePermission {
  entity: string;
  admin: Permission;
  manager: Permission;
  staff: Permission;
  viewer: Permission;
}

const permissions: RolePermission[] = [
  { entity: 'Contacts/Segments', admin: 'full', manager: 'full', staff: 'limited', viewer: 'view' },
  { entity: 'Messages/Campaigns', admin: 'full', manager: 'full', staff: 'limited', viewer: 'none' },
  { entity: 'Events', admin: 'full', manager: 'full', staff: 'full', viewer: 'view' },
  { entity: 'Donations', admin: 'full', manager: 'full', staff: 'view', viewer: 'view' },
  { entity: 'Tasks', admin: 'full', manager: 'full', staff: 'full', viewer: 'none' },
  { entity: 'Policy Docs', admin: 'full', manager: 'full', staff: 'limited', viewer: 'none' },
  { entity: 'Studio', admin: 'full', manager: 'full', staff: 'limited', viewer: 'none' },
  { entity: 'Ops Runbook', admin: 'full', manager: 'full', staff: 'limited', viewer: 'none' },
  { entity: 'Roles & Permissions', admin: 'full', manager: 'none', staff: 'none', viewer: 'none' },
  { entity: 'Audit Log', admin: 'full', manager: 'full', staff: 'full', viewer: 'view' },
];

const roles = [
  { key: 'admin', label: 'Admin', description: '모든 권한', count: 1 },
  { key: 'manager', label: 'Manager', description: '역할/권한 제외 대부분', count: 3 },
  { key: 'staff', label: 'Staff', description: '제한된 권한', count: 8 },
  { key: 'viewer', label: 'Viewer', description: '읽기 전용', count: 2 },
];

const getPermissionIcon = (permission: Permission) => {
  switch (permission) {
    case 'full':
      return <Check className="h-4 w-4 text-success" />;
    case 'limited':
      return <Minus className="h-4 w-4 text-warning" />;
    case 'view':
      return <Check className="h-4 w-4 text-muted-foreground" />;
    case 'none':
      return <X className="h-4 w-4 text-muted-foreground/50" />;
  }
};

export default function RolesPage() {
  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">권한/역할 관리</h1>
        <p className="text-muted-foreground">RBAC 설정</p>
      </div>

      {/* 역할 카드 */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role) => (
          <Card key={role.key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{role.label}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
              <Badge variant="secondary">{role.count}명</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 권한 매트릭스 */}
      <Card>
        <CardHeader>
          <CardTitle>권한 매트릭스</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">엔터티</th>
                <th className="text-center p-4 font-medium">Admin</th>
                <th className="text-center p-4 font-medium">Manager</th>
                <th className="text-center p-4 font-medium">Staff</th>
                <th className="text-center p-4 font-medium">Viewer</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4 font-medium">{perm.entity}</td>
                  <td className="p-4 text-center">{getPermissionIcon(perm.admin)}</td>
                  <td className="p-4 text-center">{getPermissionIcon(perm.manager)}</td>
                  <td className="p-4 text-center">{getPermissionIcon(perm.staff)}</td>
                  <td className="p-4 text-center">{getPermissionIcon(perm.viewer)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 범례 */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-success" />
          <span>전체 권한</span>
        </div>
        <div className="flex items-center gap-2">
          <Minus className="h-4 w-4 text-warning" />
          <span>제한 (승인 필요)</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-muted-foreground" />
          <span>읽기 전용</span>
        </div>
        <div className="flex items-center gap-2">
          <X className="h-4 w-4 text-muted-foreground/50" />
          <span>권한 없음</span>
        </div>
      </div>
    </div>
  );
}
