'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  Save,
  RefreshCw,
  X,
  Plus,
  Trash2,
  FileText,
  Shield,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/rbac';
import type { UserRole } from '@/lib/types';
import { useTenantPreference, useSaveTenantPreference } from '@/hooks/useTenantPreference';
import { DEFAULT_TERMS, DEFAULT_PRIVACY } from '@/lib/legal-defaults';
import type { LegalDocument, LegalSection, LegalContactInfo } from '@/lib/legal-defaults';

export default function LegalSettingsPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: UserRole })?.role || 'member';
  const canEdit = hasPermission(userRole, 'settings', 'update');

  // 데이터 로드
  const { data: termsData, isLoading: termsLoading } = useTenantPreference<LegalDocument>('terms_content');
  const { data: privacyData, isLoading: privacyLoading } = useTenantPreference<LegalDocument>('privacy_content');
  const savePref = useSaveTenantPreference();

  // 폼 상태
  const [terms, setTerms] = useState<LegalDocument>(DEFAULT_TERMS);
  const [privacy, setPrivacy] = useState<LegalDocument>(DEFAULT_PRIVACY);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('terms');

  // 서버 데이터로 초기화
  useEffect(() => {
    if (!termsLoading) {
      setTerms(termsData || DEFAULT_TERMS);
    }
  }, [termsData, termsLoading]);

  useEffect(() => {
    if (!privacyLoading) {
      setPrivacy(privacyData || DEFAULT_PRIVACY);
    }
  }, [privacyData, privacyLoading]);

  const isLoading = termsLoading || privacyLoading;

  // 섹션 추가
  const addSection = (type: 'terms' | 'privacy') => {
    const setter = type === 'terms' ? setTerms : setPrivacy;
    setter((prev) => ({
      ...prev,
      sections: [...prev.sections, { heading: '', content: '' }],
    }));
    setHasChanges(true);
  };

  // 섹션 삭제
  const removeSection = (type: 'terms' | 'privacy', index: number) => {
    const setter = type === 'terms' ? setTerms : setPrivacy;
    setter((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  };

  // 섹션 수정
  const updateSection = (
    type: 'terms' | 'privacy',
    index: number,
    field: keyof LegalSection,
    value: string | string[]
  ) => {
    const setter = type === 'terms' ? setTerms : setPrivacy;
    setter((prev) => {
      const newSections = [...prev.sections];
      newSections[index] = { ...newSections[index], [field]: value };
      return { ...prev, sections: newSections };
    });
    setHasChanges(true);
  };

  // 항목 추가
  const addItem = (type: 'terms' | 'privacy', sectionIdx: number) => {
    const doc = type === 'terms' ? terms : privacy;
    const items = doc.sections[sectionIdx].items || [];
    updateSection(type, sectionIdx, 'items', [...items, '']);
  };

  // 항목 삭제
  const removeItem = (type: 'terms' | 'privacy', sectionIdx: number, itemIdx: number) => {
    const doc = type === 'terms' ? terms : privacy;
    const items = (doc.sections[sectionIdx].items || []).filter((_, i) => i !== itemIdx);
    updateSection(type, sectionIdx, 'items', items);
  };

  // 항목 수정
  const updateItem = (type: 'terms' | 'privacy', sectionIdx: number, itemIdx: number, value: string) => {
    const doc = type === 'terms' ? terms : privacy;
    const items = [...(doc.sections[sectionIdx].items || [])];
    items[itemIdx] = value;
    updateSection(type, sectionIdx, 'items', items);
  };

  // 메타 수정
  const updateMeta = (type: 'terms' | 'privacy', field: 'lastUpdated' | 'orgName', value: string) => {
    const setter = type === 'terms' ? setTerms : setPrivacy;
    setter((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // 담당자 정보 수정
  const updateContactInfo = (field: keyof LegalContactInfo, value: string) => {
    setPrivacy((prev) => ({
      ...prev,
      contactInfo: { ...(prev.contactInfo || { name: '', position: '', phone: '', email: '' }), [field]: value },
    }));
    setHasChanges(true);
  };

  // 저장
  const handleSave = async () => {
    try {
      await Promise.all([
        savePref.mutateAsync({ key: 'terms_content', value: terms }),
        savePref.mutateAsync({ key: 'privacy_content', value: privacy }),
      ]);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save legal documents:', error);
    }
  };

  // 되돌리기
  const handleReset = () => {
    setTerms(termsData || DEFAULT_TERMS);
    setPrivacy(privacyData || DEFAULT_PRIVACY);
    setHasChanges(false);
  };

  // 기본값 복원
  const handleRestoreDefaults = (type: 'terms' | 'privacy') => {
    if (type === 'terms') {
      setTerms(DEFAULT_TERMS);
    } else {
      setPrivacy(DEFAULT_PRIVACY);
    }
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderSectionEditor = (type: 'terms' | 'privacy') => {
    const doc = type === 'terms' ? terms : privacy;

    return (
      <div className="space-y-6">
        {/* 메타 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">최종 수정일</label>
                <Input
                  value={doc.lastUpdated}
                  onChange={(e) => updateMeta(type, 'lastUpdated', e.target.value)}
                  placeholder="예: 2025년 1월 1일"
                  disabled={!canEdit}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">운영자명</label>
                <Input
                  value={doc.orgName}
                  onChange={(e) => updateMeta(type, 'orgName', e.target.value)}
                  placeholder="예: 캠프원 서비스 운영자"
                  disabled={!canEdit}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRestoreDefaults(type)}
                disabled={!canEdit}
              >
                기본값 복원
              </Button>
              <Link href={`/${tenant}/${type === 'terms' ? 'terms' : 'privacy'}`} target="_blank">
                <Button variant="ghost" size="sm">
                  미리보기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 섹션 목록 */}
        {doc.sections.map((section, sIdx) => (
          <Card key={sIdx}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">
                  섹션 {sIdx + 1}
                </CardTitle>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeSection(type, sIdx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">제목</label>
                <Input
                  value={section.heading}
                  onChange={(e) => updateSection(type, sIdx, 'heading', e.target.value)}
                  placeholder="예: 제1조 (목적)"
                  disabled={!canEdit}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">본문</label>
                <Textarea
                  value={section.content}
                  onChange={(e) => updateSection(type, sIdx, 'content', e.target.value)}
                  placeholder="본문 내용을 입력하세요"
                  rows={3}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">항목 (목록)</label>
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => addItem(type, sIdx)}>
                      <Plus className="h-3 w-3 mr-1" />
                      항목 추가
                    </Button>
                  )}
                </div>
                {(section.items || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">항목이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {(section.items || []).map((item, iIdx) => (
                      <div key={iIdx} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4 shrink-0">{iIdx + 1}</span>
                        <Input
                          value={item}
                          onChange={(e) => updateItem(type, sIdx, iIdx, e.target.value)}
                          placeholder="항목 내용"
                          className="flex-1 text-sm"
                          disabled={!canEdit}
                        />
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                            onClick={() => removeItem(type, sIdx, iIdx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* 섹션 추가 */}
        {canEdit && (
          <Button variant="outline" className="w-full" onClick={() => addSection(type)}>
            <Plus className="h-4 w-4 mr-2" />
            섹션 추가
          </Button>
        )}

        {/* 개인정보 보호책임자 (개인정보처리방침 전용) */}
        {type === 'privacy' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">개인정보 보호책임자</CardTitle>
              <CardDescription>개인정보 보호책임자 연락처 정보</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">성명</label>
                  <Input
                    value={doc.contactInfo?.name || ''}
                    onChange={(e) => updateContactInfo('name', e.target.value)}
                    placeholder="예: 홍길동"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">직책</label>
                  <Input
                    value={doc.contactInfo?.position || ''}
                    onChange={(e) => updateContactInfo('position', e.target.value)}
                    placeholder="예: 사무국장"
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">연락처</label>
                  <Input
                    value={doc.contactInfo?.phone || ''}
                    onChange={(e) => updateContactInfo('phone', e.target.value)}
                    placeholder="예: 055-123-4567"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">이메일</label>
                  <Input
                    value={doc.contactInfo?.email || ''}
                    onChange={(e) => updateContactInfo('email', e.target.value)}
                    placeholder="예: privacy@example.com"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${tenant}/settings`}>
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">약관 및 개인정보처리방침</h1>
            <p className="text-muted-foreground">법적 고지 문서 관리</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!canEdit && <Badge variant="secondary">읽기 전용</Badge>}
          {canEdit && hasChanges && (
            <>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <X className="h-4 w-4 mr-1" />
                되돌리기
              </Button>
              <Button size="sm" onClick={handleSave} disabled={savePref.isPending}>
                {savePref.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                저장
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 탭 전환 */}
      <div className="flex rounded-lg border p-1 bg-muted/50">
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'terms'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('terms')}
        >
          <FileText className="h-4 w-4" />
          이용약관
        </button>
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'privacy'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('privacy')}
        >
          <Shield className="h-4 w-4" />
          개인정보처리방침
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'terms' && renderSectionEditor('terms')}
        {activeTab === 'privacy' && renderSectionEditor('privacy')}
      </div>
    </div>
  );
}
