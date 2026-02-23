'use client';

import React, { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Plus, Trash2, Upload, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
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
import { hasPermission } from '@/lib/rbac';
import { useTenant } from '@/lib/tenant/TenantContext';
import {
  useHelpDocuments,
  useUploadHelpDocument,
  useDeleteHelpDocument,
} from '@/hooks/useHelpDocuments';

const CATEGORIES = [
  { value: 'general', label: '일반' },
  { value: 'module', label: '모듈 가이드' },
  { value: 'admin', label: '관리자 가이드' },
  { value: 'faq', label: 'FAQ' },
];

export default function HelpDocumentsPage() {
  const { data: session } = useSession();
  const { tenantId } = useTenant();
  const userRole = (session?.user as { role?: string })?.role || 'viewer';
  const isAdmin = hasPermission(userRole, 'admin');

  const { data, isLoading } = useHelpDocuments();
  const uploadMutation = useUploadHelpDocument();
  const deleteMutation = useDeleteHelpDocument();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Upload form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isAdmin) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <p className="text-muted-foreground">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title || selectedFile.name);
    formData.append('category', category);

    try {
      await uploadMutation.mutateAsync(formData);
      setUploadOpen(false);
      setTitle('');
      setCategory('general');
      setSelectedFile(null);
    } catch {
      // error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // error handled by mutation
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/${tenantId}/settings`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">도움말 문서 관리</h1>
          <p className="text-muted-foreground">AI 챗봇이 참고할 문서를 관리합니다</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          문서 업로드
        </Button>
      </div>

      {/* Document list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">문서 목록</CardTitle>
          <CardDescription>
            총 {data?.total ?? 0}개의 문서가 등록되어 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.items.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>등록된 문서가 없습니다</p>
              <p className="text-sm">PDF, TXT, MD 파일을 업로드해주세요</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.items.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 py-3">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {CATEGORIES.find((c) => c.value === doc.category)?.label || doc.category}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget({ id: doc.id, title: doc.title })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>문서 업로드</DialogTitle>
            <DialogDescription>
              PDF, TXT, MD 파일을 업로드하면 AI가 참고할 수 있습니다 (최대 5MB)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">파일</label>
              <div className="mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {selectedFile ? selectedFile.name : '파일 선택'}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">제목</label>
              <Input
                className="mt-1"
                placeholder="문서 제목 (비워두면 파일명 사용)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">카테고리</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="gap-2"
            >
              {uploadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              업로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>문서 삭제</DialogTitle>
            <DialogDescription>
              &quot;{deleteTarget?.title}&quot; 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수
              없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
