'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  MapPin,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// 샘플 데이터
const trendData = [
  { date: '01/04', google: 60, naver: 63, sns: 65 },
  { date: '01/05', google: 58, naver: 62, sns: 62 },
  { date: '01/06', google: 62, naver: 66, sns: 68 },
  { date: '01/07', google: 65, naver: 70, sns: 72 },
  { date: '01/08', google: 63, naver: 69, sns: 70 },
  { date: '01/09', google: 66, naver: 72, sns: 74 },
  { date: '01/10', google: 70, naver: 75, sns: 78 },
];

const topKeywords = [
  { keyword: '홍길동', count: 1250, change: 15 },
  { keyword: '타운홀', count: 890, change: 28 },
  { keyword: '청년정책', count: 720, change: 12 },
  { keyword: '경제공약', count: 580, change: -5 },
  { keyword: '출정식', count: 450, change: 45 },
];

const regionData = [
  { region: '서울', score: 78, sentiment: 'positive' },
  { region: '경기', score: 72, sentiment: 'positive' },
  { region: '부산', score: 65, sentiment: 'neutral' },
  { region: '대구', score: 58, sentiment: 'neutral' },
  { region: '인천', score: 70, sentiment: 'positive' },
  { region: '광주', score: 62, sentiment: 'neutral' },
];

const alerts = [
  { type: 'spike', message: 'SNS 멘션 25% 급증', source: 'Twitter', time: '30분 전' },
  { type: 'negative', message: '부정 키워드 감지: "논란"', source: 'Naver', time: '1시간 전' },
];

export default function InsightsManagePage() {
  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pulse">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Insights 관리</h1>
            <p className="text-muted-foreground">여론 동향 모니터링 및 분석</p>
          </div>
        </div>
        <Button>
          <RefreshCw className="mr-2 h-4 w-4" />
          데이터 새로고침
        </Button>
      </div>

      {/* KPI 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">합성 지수</div>
            <div className="text-3xl font-bold text-primary">72</div>
            <div className="flex items-center text-sm text-success">
              <TrendingUp className="h-4 w-4 mr-1" />
              +8.5%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">긍정 비율</div>
            <div className="text-3xl font-bold text-success">68%</div>
            <div className="flex items-center text-sm text-success">
              <TrendingUp className="h-4 w-4 mr-1" />
              +3%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">일일 멘션</div>
            <div className="text-3xl font-bold">1,750</div>
            <div className="flex items-center text-sm text-success">
              <TrendingUp className="h-4 w-4 mr-1" />
              +25%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">경보</div>
            <div className="text-3xl font-bold text-warning">2</div>
            <div className="text-sm text-muted-foreground">확인 필요</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 트렌드 차트 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>트렌드 추이 (7일)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {trendData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 h-48 items-end">
                    <div
                      className="flex-1 bg-blue-500 rounded-t"
                      style={{ height: `${d.google}%` }}
                      title={`Google: ${d.google}`}
                    />
                    <div
                      className="flex-1 bg-green-500 rounded-t"
                      style={{ height: `${d.naver}%` }}
                      title={`Naver: ${d.naver}`}
                    />
                    <div
                      className="flex-1 bg-purple-500 rounded-t"
                      style={{ height: `${d.sns}%` }}
                      title={`SNS: ${d.sns}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{d.date}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-blue-500" />
                <span className="text-sm">Google</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-green-500" />
                <span className="text-sm">Naver</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-purple-500" />
                <span className="text-sm">SNS</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 키워드 Top 5 */}
        <Card>
          <CardHeader>
            <CardTitle>키워드 Top 5</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topKeywords.map((kw, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">{i + 1}</span>
                    <span className="font-medium">{kw.keyword}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {kw.count.toLocaleString()}
                    </span>
                    <Badge
                      variant={kw.change >= 0 ? 'success' : 'danger'}
                      className="text-xs"
                    >
                      {kw.change >= 0 ? '+' : ''}
                      {kw.change}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 지역별 관심도 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              지역별 관심도
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {regionData.map((r, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="w-12 font-medium">{r.region}</span>
                  <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        r.sentiment === 'positive' && 'bg-success',
                        r.sentiment === 'neutral' && 'bg-warning',
                        r.sentiment === 'negative' && 'bg-danger'
                      )}
                      style={{ width: `${r.score}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-medium">{r.score}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 경보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              리스크 경보
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-warning/10"
                  >
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.source} · {alert.time}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      확인
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                현재 경보가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
