'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  Save,
  RefreshCw,
  X,
  Plus,
  Trash2,
  Upload,
  ImageIcon,
  Loader2,
  Briefcase,
  GraduationCap,
  Users,
  Award,
  Building,
  Heart,
  Star,
  MapPin,
  AlertCircle,
  Phone,
  Mail,
  Clock,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCampaignProfile, useUpdateCampaignProfile, CareerItem, ModuleImages } from '@/hooks/useCampaignProfile';
import { hasPermission } from '@/lib/rbac';
import type { UserRole } from '@/lib/types';

// 모듈 메타 (이미지 업로드 UI용)
const MODULE_META = [
  { key: 'pulse', name: 'Insights', defaultImage: '/module-i.png' },
  { key: 'studio', name: 'Studio', defaultImage: '/module-s.png' },
  { key: 'policy', name: 'Policy Lab', defaultImage: '/module-p.png' },
  { key: 'ops', name: 'Ops', defaultImage: '/module-o.png' },
  { key: 'hub', name: 'Civic Hub', defaultImage: '/module-c.png' },
];

// 아이콘 옵션
const ICON_OPTIONS = [
  { key: 'Briefcase', label: '서류가방', Icon: Briefcase },
  { key: 'GraduationCap', label: '학사모', Icon: GraduationCap },
  { key: 'Users', label: '사람들', Icon: Users },
  { key: 'Award', label: '수상', Icon: Award },
  { key: 'Building', label: '건물', Icon: Building },
  { key: 'Heart', label: '하트', Icon: Heart },
  { key: 'Star', label: '별', Icon: Star },
  { key: 'MapPin', label: '위치', Icon: MapPin },
];

function getIconComponent(iconKey: string) {
  const found = ICON_OPTIONS.find((opt) => opt.key === iconKey);
  return found?.Icon || Briefcase;
}

export default function CampaignProfilePage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: UserRole })?.role || 'member';
  const canEdit = hasPermission(userRole, 'settings', 'update');

  const { data: profileData, isLoading, isError, refetch } = useCampaignProfile();
  const updateProfile = useUpdateCampaignProfile();

  // 폼 상태
  const [candidateName, setCandidateName] = useState('');
  const [candidateTitle, setCandidateTitle] = useState('');
  const [orgName, setOrgName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [moduleImages, setModuleImages] = useState<ModuleImages>({});
  const [careers, setCareers] = useState<CareerItem[]>([]);
  const [slogans, setSlogans] = useState<string[]>([]);
  // 연락처 정보 (푸터용)
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  // 업로드 상태
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingModule, setUploadingModule] = useState<string | null>(null);

  // 서버 데이터로 초기화
  useEffect(() => {
    if (profileData?.profile) {
      const p = profileData.profile;
      setCandidateName(p.candidateName);
      setCandidateTitle(p.candidateTitle);
      setOrgName(p.orgName);
      setPhotoUrl(p.photoUrl || '');
      setModuleImages(p.moduleImages || {});
      setCareers(p.careers || []);
      setSlogans(p.slogans || []);
      // 연락처 정보
      setAddress(p.address || '');
      setPhone(p.phone || '');
      setEmail(p.email || '');
      setHours(p.hours || '');
      setDescription(p.description || '');
      setHasChanges(false);
    }
  }, [profileData]);

  // 경력 추가
  const addCareer = () => {
    setCareers([...careers, { icon: 'Briefcase', text: '' }]);
    setHasChanges(true);
  };

  // 경력 삭제
  const removeCareer = (index: number) => {
    setCareers(careers.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // 경력 수정
  const updateCareer = (index: number, field: 'icon' | 'text', value: string) => {
    const newCareers = [...careers];
    newCareers[index] = { ...newCareers[index], [field]: value };
    setCareers(newCareers);
    setHasChanges(true);
  };

  // 슬로건 추가
  const addSlogan = () => {
    setSlogans([...slogans, '']);
    setHasChanges(true);
  };

  // 슬로건 삭제
  const removeSlogan = (index: number) => {
    setSlogans(slogans.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // 슬로건 수정
  const updateSlogan = (index: number, value: string) => {
    const newSlogans = [...slogans];
    newSlogans[index] = value;
    setSlogans(newSlogans);
    setHasChanges(true);
  };

  // 파일 업로드 헬퍼
  const uploadFile = async (file: File, category: 'profile' | 'module', moduleKey?: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (moduleKey) formData.append('moduleKey', moduleKey);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || '업로드 실패');
      return null;
    }
    const data = await res.json();
    return data.url;
  };

  // 후보사진 업로드
  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProfile(true);
    try {
      const url = await uploadFile(file, 'profile');
      if (url) {
        setPhotoUrl(url);
        setHasChanges(true);
      }
    } finally {
      setUploadingProfile(false);
      e.target.value = '';
    }
  };

  // 모듈 이미지 업로드
  const handleModuleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, moduleKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingModule(moduleKey);
    try {
      const url = await uploadFile(file, 'module', moduleKey);
      if (url) {
        setModuleImages(prev => ({ ...prev, [moduleKey]: url }));
        setHasChanges(true);
      }
    } finally {
      setUploadingModule(null);
      e.target.value = '';
    }
  };

  // 저장
  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        candidateName,
        candidateTitle,
        orgName,
        photoUrl: photoUrl || null,
        moduleImages,
        careers,
        slogans,
        address: address || null,
        phone: phone || null,
        email: email || null,
        hours: hours || null,
        description: description || null,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  // 되돌리기
  const handleReset = () => {
    if (profileData?.profile) {
      const p = profileData.profile;
      setCandidateName(p.candidateName);
      setCandidateTitle(p.candidateTitle);
      setOrgName(p.orgName);
      setPhotoUrl(p.photoUrl || '');
      setModuleImages(p.moduleImages || {});
      setCareers(p.careers || []);
      setSlogans(p.slogans || []);
      setAddress(p.address || '');
      setPhone(p.phone || '');
      setEmail(p.email || '');
      setHours(p.hours || '');
      setDescription(p.description || '');
      setHasChanges(false);
    }
  };

  // 필드 변경 감지
  const handleFieldChange = () => {
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">프로필 정보를 불러올 수 없습니다</p>
          <Button variant="outline" onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold">캠페인 프로필</h1>
            <p className="text-muted-foreground">메인 대시보드 상단의 후보자 정보</p>
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
              <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? (
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

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
          <CardDescription>후보자 이름, 직함 등 기본 정보를 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">후보자 이름 *</label>
              <Input
                value={candidateName}
                onChange={(e) => {
                  setCandidateName(e.target.value);
                  handleFieldChange();
                }}
                placeholder="예: 홍길동"
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">직함 *</label>
              <Input
                value={candidateTitle}
                onChange={(e) => {
                  setCandidateTitle(e.target.value);
                  handleFieldChange();
                }}
                placeholder="예: OO시장 후보"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">조직명</label>
            <Input
              value={orgName}
              onChange={(e) => {
                setOrgName(e.target.value);
                handleFieldChange();
              }}
              placeholder="예: 선거대책본부"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">후보자 사진</label>
            <div className="flex items-start gap-4">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border bg-muted flex items-center justify-center shrink-0">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt="후보자 사진"
                    fill
                    className="object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                {canEdit && (
                  <div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleProfilePhotoUpload}
                        disabled={uploadingProfile}
                      />
                      <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                        <span>
                          {uploadingProfile ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {uploadingProfile ? '업로드 중...' : '사진 업로드'}
                        </span>
                      </Button>
                    </label>
                  </div>
                )}
                <Input
                  value={photoUrl}
                  onChange={(e) => {
                    setPhotoUrl(e.target.value);
                    handleFieldChange();
                  }}
                  placeholder="또는 이미지 URL 직접 입력"
                  disabled={!canEdit}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WebP (최대 10MB)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 경력 정보 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">경력 정보</CardTitle>
              <CardDescription>메인 대시보드에 표시될 주요 경력을 설정합니다.</CardDescription>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={addCareer}>
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {careers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              등록된 경력이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {careers.map((career, index) => {
                const IconComponent = getIconComponent(career.icon);
                return (
                  <div key={index} className="flex items-center gap-3">
                    <Select
                      value={career.icon}
                      onValueChange={(value) => updateCareer(index, 'icon', value)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((opt) => (
                          <SelectItem key={opt.key} value={opt.key}>
                            <div className="flex items-center gap-2">
                              <opt.Icon className="h-4 w-4" />
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={career.text}
                      onChange={(e) => updateCareer(index, 'text', e.target.value)}
                      placeholder="예: 행정경력 15년"
                      className="flex-1"
                      disabled={!canEdit}
                    />
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeCareer(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 슬로건 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">슬로건</CardTitle>
              <CardDescription>메인 대시보드에 표시될 슬로건을 설정합니다. (데스크탑만 표시)</CardDescription>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={addSlogan}>
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {slogans.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              등록된 슬로건이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {slogans.map((slogan, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Badge variant={index === 0 ? 'default' : 'secondary'} className="shrink-0">
                    {index + 1}
                  </Badge>
                  <Input
                    value={slogan}
                    onChange={(e) => updateSlogan(index, e.target.value)}
                    placeholder="예: 국민과 함께하는 정치"
                    className="flex-1"
                    disabled={!canEdit}
                  />
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeSlogan(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            첫 번째 슬로건은 강조 스타일로 표시됩니다.
          </p>
        </CardContent>
      </Card>

      {/* 연락처 정보 (푸터용) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">연락처 정보</CardTitle>
          <CardDescription>푸터에 표시될 연락처 및 선거사무소 정보를 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              <MapPin className="h-4 w-4 inline mr-1" />
              주소
            </label>
            <Input
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                handleFieldChange();
              }}
              placeholder="예: 경남 사천시 사천읍 중앙로 123"
              disabled={!canEdit}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                <Phone className="h-4 w-4 inline mr-1" />
                전화번호
              </label>
              <Input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  handleFieldChange();
                }}
                placeholder="예: 055-123-4567"
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                <Mail className="h-4 w-4 inline mr-1" />
                이메일
              </label>
              <Input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleFieldChange();
                }}
                placeholder="예: contact@example.com"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              <Clock className="h-4 w-4 inline mr-1" />
              운영시간
            </label>
            <Input
              value={hours}
              onChange={(e) => {
                setHours(e.target.value);
                handleFieldChange();
              }}
              placeholder="예: 평일 09:00 - 18:00"
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">소개글</label>
            <Textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                handleFieldChange();
              }}
              placeholder="선거캠프 소개글을 입력하세요"
              rows={3}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* 모듈 바로가기 이미지 */}
      {canEdit && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ImageIcon className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">모듈 바로가기 이미지</CardTitle>
                <CardDescription>메인 대시보드의 모듈 카드 이미지를 변경합니다.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MODULE_META.map((mod) => {
                const currentImage = moduleImages[mod.key] || mod.defaultImage;
                const isUploading = uploadingModule === mod.key;
                return (
                  <div key={mod.key} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{mod.name}</span>
                      {moduleImages[mod.key] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground"
                          onClick={() => {
                            setModuleImages(prev => {
                              const next = { ...prev };
                              delete next[mod.key];
                              return next;
                            });
                            setHasChanges(true);
                          }}
                        >
                          기본값 복원
                        </Button>
                      )}
                    </div>
                    <div className="relative w-full aspect-[16/10] rounded-md overflow-hidden border bg-muted">
                      <Image
                        src={currentImage}
                        alt={mod.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = mod.defaultImage;
                        }}
                      />
                      {isUploading && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleModuleImageUpload(e, mod.key)}
                        disabled={isUploading}
                      />
                      <Button type="button" variant="outline" size="sm" className="w-full gap-2" asChild>
                        <span>
                          <Upload className="h-3 w-3" />
                          이미지 변경
                        </span>
                      </Button>
                    </label>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              권장 비율 16:10, JPG/PNG/WebP (최대 10MB). 변경 후 저장 버튼을 눌러야 반영됩니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
