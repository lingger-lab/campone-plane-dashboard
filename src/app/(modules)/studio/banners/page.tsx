'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const presets = [
  { id: 'bp001', name: '가로형 대', size: '3600×900mm', selected: false },
  { id: 'bp002', name: '가로형 중', size: '4000×700mm', selected: false },
  { id: 'bp003', name: '가로형 광폭', size: '5000×900mm', selected: false },
  { id: 'bp004', name: '가로형 초광폭', size: '7000×900mm', selected: false },
  { id: 'bp005', name: '세로형', size: '600×1800mm', selected: false },
];

export default function BannerDesignerPage() {
  const [selectedPreset, setSelectedPreset] = useState<string | null>('bp001');
  const [formData, setFormData] = useState({
    candidate: '홍길동',
    title: '국회의원 후보',
    slogan: '변화를 만드는 힘',
    contact: '02-1234-5678',
    qrUrl: 'https://hongdemo.com',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/studio/manage">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">현수막 디자이너</h1>
            <p className="text-muted-foreground">현수막/배너 템플릿 제작</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            미리보기
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 좌측: 설정 */}
        <div className="space-y-6">
          {/* 프리셋 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">사이즈 프리셋</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedPreset === preset.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => setSelectedPreset(preset.id)}
                >
                  <div>
                    <p className="font-medium">{preset.name}</p>
                    <p className="text-sm text-muted-foreground">{preset.size}</p>
                  </div>
                  {selectedPreset === preset.id && (
                    <Badge variant="default">선택됨</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 변수 입력 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">콘텐츠 입력</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">후보 이름</label>
                <Input
                  value={formData.candidate}
                  onChange={(e) => handleInputChange('candidate', e.target.value)}
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">직함</label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="국회의원 후보"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">슬로건</label>
                <Input
                  value={formData.slogan}
                  onChange={(e) => handleInputChange('slogan', e.target.value)}
                  placeholder="변화를 만드는 힘"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">연락처</label>
                <Input
                  value={formData.contact}
                  onChange={(e) => handleInputChange('contact', e.target.value)}
                  placeholder="02-1234-5678"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">QR 링크</label>
                <Input
                  value={formData.qrUrl}
                  onChange={(e) => handleInputChange('qrUrl', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* 출력 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">출력 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">해상도</span>
                <Badge variant="outline">300 DPI</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">컬러모드</span>
                <Badge variant="outline">CMYK</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">여백</span>
                <Badge variant="outline">20mm</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">재단선</span>
                <Badge variant="outline">포함</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 우측: 미리보기 */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">미리보기</CardTitle>
                <Button variant="ghost" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  새로고침
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* 미리보기 영역 */}
              <div className="aspect-[4/1] bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center p-8 text-white">
                <div className="flex items-center gap-8 w-full">
                  {/* 후보 사진 영역 */}
                  <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-4xl font-bold">{formData.candidate[0]}</span>
                  </div>

                  {/* 텍스트 영역 */}
                  <div className="flex-1 text-center">
                    <p className="text-lg opacity-80">{formData.title}</p>
                    <h2 className="text-5xl font-bold my-2">{formData.candidate}</h2>
                    <p className="text-2xl font-medium">{formData.slogan}</p>
                  </div>

                  {/* QR/연락처 */}
                  <div className="text-right shrink-0">
                    <div className="w-20 h-20 bg-white rounded-lg mb-2 flex items-center justify-center">
                      <span className="text-primary text-xs">QR</span>
                    </div>
                    <p className="text-sm">{formData.contact}</p>
                  </div>
                </div>
              </div>

              {/* 파일명 미리보기 */}
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">출력 파일명:</p>
                <p className="font-mono text-sm">
                  20250110_서울_타운홀_{presets.find((p) => p.id === selectedPreset)?.name}.pdf
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
