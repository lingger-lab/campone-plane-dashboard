'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Minus, UserCog, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from 'next-auth/react';

type Permission = 'full' | 'limited' | 'view' | 'none';
type UserRole = 'admin' | 'analyst' | 'operator' | 'content_manager' | 'civichub_admin' | 'member';

interface RoleData {
  key: string;
  label: string;
  description: string;
  count: number;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

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

const getRoleBadgeVariant = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return 'default';
    case 'analyst':
      return 'secondary';
    case 'operator':
      return 'secondary';
    case 'content_manager':
      return 'outline';
    case 'civichub_admin':
      return 'outline';
    case 'member':
      return 'outline';
  }
};

export default function RolesPage() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // 새 사용자 폼
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    role: 'member' as UserRole,
  });

  const isAdmin = session?.user?.role === 'admin';

  // 데이터 로드
  const fetchData = async () => {
    try {
      const [rolesRes, usersRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/users'),
      ]);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.roles);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  // 역할 변경
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        await fetchData();
        setEditDialogOpen(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setSaving(false);
    }
  };

  // 사용자 생성
  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password) return;

    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        await fetchData();
        setCreateDialogOpen(false);
        setNewUser({ email: '', name: '', password: '', role: 'member' });
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setSaving(false);
    }
  };

  // 사용자 비활성화
  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('이 사용자를 비활성화하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to deactivate user:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">권한이 없습니다</h2>
            <p className="text-muted-foreground">
              권한/역할 관리는 Admin만 접근할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">권한/역할 관리</h1>
          <p className="text-muted-foreground">RBAC 설정 및 사용자 관리</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          사용자 추가
        </Button>
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

      {/* 사용자 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            사용자 목록
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">이름</th>
                <th className="text-left p-4 font-medium">이메일</th>
                <th className="text-center p-4 font-medium">역할</th>
                <th className="text-center p-4 font-medium">상태</th>
                <th className="text-center p-4 font-medium">마지막 로그인</th>
                <th className="text-right p-4 font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-4 font-medium">{user.name}</td>
                  <td className="p-4 text-muted-foreground">{user.email}</td>
                  <td className="p-4 text-center">
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? '활성' : '비활성'}
                    </Badge>
                  </td>
                  <td className="p-4 text-center text-sm text-muted-foreground">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleString('ko-KR')
                      : '-'}
                  </td>
                  <td className="p-4 text-right">
                    {user.id !== session?.user?.id && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setEditDialogOpen(true);
                          }}
                        >
                          역할 변경
                        </Button>
                        {user.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivateUser(user.id)}
                          >
                            비활성화
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

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

      {/* 역할 변경 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>역할 변경</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">사용자</p>
                <p className="font-medium">
                  {selectedUser.name} ({selectedUser.email})
                </p>
              </div>
              <div className="space-y-2">
                <Label>새 역할</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value) =>
                    setSelectedUser({ ...selectedUser, role: value as UserRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">admin - 모든 권한</SelectItem>
                    <SelectItem value="analyst">analyst - 여론 분석</SelectItem>
                    <SelectItem value="operator">operator - 운영 관리</SelectItem>
                    <SelectItem value="content_manager">content_manager - 콘텐츠 관리</SelectItem>
                    <SelectItem value="civichub_admin">civichub_admin - 시민 소통 관리</SelectItem>
                    <SelectItem value="member">member - 일반 멤버</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() =>
                selectedUser && handleRoleChange(selectedUser.id, selectedUser.role)
              }
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 사용자 생성 다이얼로그 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 사용자 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="홍길동"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@campone.kr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>역할</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) =>
                  setNewUser({ ...newUser, role: value as UserRole })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="analyst">analyst</SelectItem>
                  <SelectItem value="operator">operator</SelectItem>
                  <SelectItem value="content_manager">content_manager</SelectItem>
                  <SelectItem value="civichub_admin">civichub_admin</SelectItem>
                  <SelectItem value="member">member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateUser} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
