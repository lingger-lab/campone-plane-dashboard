'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Save,
  X,
  Video,
  PlayCircle,
  MapPin,
  Users,
  MessageCircle,
  FileText,
  BookOpen,
  FileCheck,
  CheckCircle2,
  Newspaper,
  List,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/rbac';
import type { UserRole } from '@/lib/types';

// 아이콘 매핑
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Video,
  PlayCircle,
  MapPin,
  Users,
  MessageCircle,
  FileText,
  BookOpen,
  FileCheck,
  CheckCircle2,
  Newspaper,
  List,
  ExternalLink,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const CATEGORY_CONFIG = {
  primary: { label: '주요 CTA', color: 'bg-primary text-white' },
  video: { label: '영상 콘텐츠', color: 'bg-red-600 text-white' },
  blog: { label: '블로그/네이버', color: 'bg-[#03C75A] text-white' },
  default: { label: '기본', color: 'bg-muted text-muted-foreground' },
};

interface QuickButton {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  category: keyof typeof CATEGORY_CONFIG;
  order: number;
  isActive: boolean;
}

export default function QuickButtonsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [buttons, setButtons] = useState<QuickButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<QuickButton | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 폼 상태
  const [formLabel, setFormLabel] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formCategory, setFormCategory] = useState<keyof typeof CATEGORY_CONFIG>('default');

  const userRole = (session?.user as { role?: UserRole })?.role || 'member';
  const canEdit = hasPermission(userRole, 'quickButtons', 'update');
  const canDelete = hasPermission(userRole, 'quickButtons', 'delete');
  const canCreate = hasPermission(userRole, 'quickButtons', 'create');

  // 기본 데이터 여부 확인 (ID가 "default-"로 시작하면 기본 데이터)
  const isDefaultData = buttons.length > 0 && buttons[0].id.startsWith('default-');

  // 데이터 로드
  useEffect(() => {
    fetchButtons();
  }, []);

  const fetchButtons = async () => {
    try {
      const res = await fetch('/api/quick-buttons');
      const data = await res.json();
      setButtons(data.buttons || []);
      // 메인 페이지의 React Query 캐시도 무효화
      queryClient.invalidateQueries({ queryKey: ['quickButtons'] });
    } catch (error) {
      console.error('Failed to fetch buttons:', error);
    } finally {
      setLoading(false);
    }
  };

  // 다이얼로그 열기 (새로 만들기)
  const openCreateDialog = () => {
    setEditingButton(null);
    setFormLabel('');
    setFormUrl('');
    setFormIcon('none');
    setFormCategory('default');
    setDialogOpen(true);
  };

  // 다이얼로그 열기 (수정)
  const openEditDialog = (button: QuickButton) => {
    setEditingButton(button);
    setFormLabel(button.label);
    setFormUrl(button.url);
    setFormIcon(button.icon || 'none');
    setFormCategory(button.category);
    setDialogOpen(true);
  };

  // 저장
  const handleSave = async () => {
    if (!formLabel.trim() || !formUrl.trim()) return;

    setSaving(true);
    try {
      if (editingButton) {
        // 수정
        const res = await fetch('/api/quick-buttons', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingButton.id,
            label: formLabel,
            url: formUrl,
            icon: formIcon && formIcon !== 'none' ? formIcon : null,
            category: formCategory,
          }),
        });
        if (res.ok) {
          await fetchButtons();
          setDialogOpen(false);
        }
      } else {
        // 새로 만들기
        const res = await fetch('/api/quick-buttons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: formLabel,
            url: formUrl,
            icon: formIcon && formIcon !== 'none' ? formIcon : null,
            category: formCategory,
          }),
        });
        if (res.ok) {
          await fetchButtons();
          setDialogOpen(false);
        }
      }
    } catch (error) {
      console.error('Failed to save button:', error);
    } finally {
      setSaving(false);
    }
  };

  // 삭제
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/quick-buttons?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchButtons();
        setDeleteConfirmId(null);
      }
    } catch (error) {
      console.error('Failed to delete button:', error);
    }
  };

  // 순서 변경 (간단한 구현 - 위/아래 이동)
  const moveButton = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === buttons.length - 1)
    ) {
      return;
    }

    const newButtons = [...buttons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newButtons[index], newButtons[targetIndex]] = [newButtons[targetIndex], newButtons[index]];

    // 순서 재할당
    const updatedButtons = newButtons.map((btn, i) => ({ ...btn, order: i }));
    setButtons(updatedButtons);

    // DB에 저장
    try {
      await fetch('/api/quick-buttons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buttons: updatedButtons.map((btn) => ({ id: btn.id, order: btn.order })),
        }),
      });
    } catch (error) {
      console.error('Failed to reorder buttons:', error);
      // 실패 시 원래대로
      fetchButtons();
    }
  };

  const renderIcon = (iconName: string | null) => {
    if (!iconName || !ICON_MAP[iconName]) return null;
    const IconComponent = ICON_MAP[iconName];
    return <IconComponent className="h-4 w-4" />;
  };

  if (!canEdit && !canCreate) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">권한이 없습니다</h3>
            <p className="text-muted-foreground mt-2">
              퀵버튼 관리는 Manager 이상의 권한이 필요합니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">퀵버튼 관리</h1>
          <p className="text-muted-foreground">메인 대시보드에 표시되는 퀵버튼 관리</p>
        </div>
        {canCreate && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            새 버튼 추가
          </Button>
        )}
      </div>

      {isDefaultData && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  기본 샘플 데이터가 표시되고 있습니다
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  아직 데이터베이스에 퀵버튼이 등록되지 않아 샘플 데이터가 표시됩니다.
                  &quot;새 버튼 추가&quot;를 눌러 직접 버튼을 등록하면 샘플 데이터가 사라지고 실제 데이터로 대체됩니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">버튼 목록</CardTitle>
          <CardDescription>
            {isDefaultData
              ? '샘플 데이터는 수정/삭제할 수 없습니다. 새 버튼을 추가해 주세요.'
              : '드래그하여 순서를 변경하거나, 버튼을 클릭하여 수정하세요.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
          ) : buttons.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              등록된 퀵버튼이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {buttons.map((button, index) => (
                <div
                  key={button.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
                    !button.isActive && 'opacity-50'
                  )}
                >
                  {canEdit && !isDefaultData && (
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => moveButton(index, 'up')}
                        disabled={index === 0}
                      >
                        ▲
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => moveButton(index, 'down')}
                        disabled={index === buttons.length - 1}
                      >
                        ▼
                      </Button>
                    </div>
                  )}

                  <GripVertical className="h-5 w-5 text-muted-foreground" />

                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
                      CATEGORY_CONFIG[button.category]?.color || CATEGORY_CONFIG.default.color
                    )}
                  >
                    {renderIcon(button.icon)}
                    <span>{button.label}</span>
                  </div>

                  <div className="flex-1 text-sm text-muted-foreground truncate">
                    {button.url}
                  </div>

                  <Badge variant="outline" className="shrink-0">
                    {CATEGORY_CONFIG[button.category]?.label || '기본'}
                  </Badge>

                  <div className="flex gap-1 shrink-0">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(button)}
                        disabled={button.id.startsWith('default-')}
                        title={button.id.startsWith('default-') ? '샘플 데이터는 수정할 수 없습니다' : '수정'}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(button.id)}
                        disabled={button.id.startsWith('default-')}
                        title={button.id.startsWith('default-') ? '샘플 데이터는 삭제할 수 없습니다' : '삭제'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 카테고리 안내 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">카테고리 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-3">
                <div className={cn('px-3 py-1.5 rounded-md text-sm font-medium', config.color)}>
                  샘플
                </div>
                <div>
                  <span className="font-medium">{config.label}</span>
                  <span className="text-muted-foreground ml-2 text-sm">
                    ({key})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 편집 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingButton ? '퀵버튼 수정' : '새 퀵버튼 추가'}
            </DialogTitle>
            <DialogDescription>
              {editingButton
                ? '퀵버튼 정보를 수정합니다.'
                : '메인 대시보드에 표시될 새 퀵버튼을 추가합니다.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">버튼 텍스트 *</label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="예: 10대 공약"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">URL *</label>
              <Input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="예: https://youtube.com/watch?v=..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                연결할 외부 링크 URL을 입력하세요
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">아이콘</label>
              <Select value={formIcon} onValueChange={setFormIcon}>
                <SelectTrigger>
                  <SelectValue placeholder="아이콘 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  {ICON_OPTIONS.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      <div className="flex items-center gap-2">
                        {renderIcon(icon)}
                        <span>{icon}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">카테고리</label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as keyof typeof CATEGORY_CONFIG)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving || !formLabel.trim() || !formUrl.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>퀵버튼 삭제</DialogTitle>
            <DialogDescription>
              이 퀵버튼을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
