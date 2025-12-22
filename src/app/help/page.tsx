'use client';

import React from 'react';
import {
  HelpCircle,
  Book,
  MessageCircle,
  Video,
  FileText,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const helpTopics = [
  {
    icon: Book,
    title: '시작하기',
    desc: '기본 사용법과 첫 번째 캠페인 설정',
    articles: 5,
  },
  {
    icon: MessageCircle,
    title: '세그먼트 & 메시징',
    desc: '세그먼트 생성과 메시지 발송 방법',
    articles: 8,
  },
  {
    icon: Video,
    title: '콘텐츠 제작',
    desc: 'Studio에서 콘텐츠 제작하기',
    articles: 6,
  },
  {
    icon: FileText,
    title: '공약 관리',
    desc: 'Policy Lab 활용 가이드',
    articles: 4,
  },
];

const faqs = [
  { q: '세그먼트는 어떻게 만드나요?', a: 'Civic Hub > 세그먼트에서 조건을 설정하여 생성할 수 있습니다.' },
  { q: 'A/B 테스트는 어떻게 하나요?', a: '메시지 작성 시 A/B 그룹을 설정하면 자동으로 분배됩니다.' },
  { q: '현수막 디자인은 어디서 하나요?', a: 'Studio > 현수막 디자인에서 프리셋을 선택하여 제작할 수 있습니다.' },
  { q: '여론 지수는 어떻게 계산되나요?', a: 'Google 트렌드(30%) + Naver(30%) + SNS(40%)의 가중 합산입니다.' },
];

export default function HelpPage() {
  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <HelpCircle className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold">도움말 센터</h1>
        <p className="text-muted-foreground">무엇을 도와드릴까요?</p>
      </div>

      {/* 검색 */}
      <div className="max-w-md mx-auto">
        <Input placeholder="검색어를 입력하세요..." className="text-center" />
      </div>

      {/* 주요 도움말 */}
      <div className="grid sm:grid-cols-2 gap-4">
        {helpTopics.map((topic, i) => (
          <Card key={i} className="card-hover cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <topic.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{topic.title}</h3>
                  <p className="text-sm text-muted-foreground">{topic.desc}</p>
                  <p className="text-xs text-primary mt-2">{topic.articles}개 문서</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 자주 묻는 질문 */}
      <Card>
        <CardHeader>
          <CardTitle>자주 묻는 질문</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b last:border-0 pb-4 last:pb-0">
              <h4 className="font-medium mb-1">{faq.q}</h4>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 추가 지원 */}
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="font-semibold mb-2">더 많은 도움이 필요하신가요?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            기술 지원팀에 문의하시면 빠르게 도움을 드리겠습니다.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline">
              <MessageCircle className="mr-2 h-4 w-4" />
              채팅 상담
            </Button>
            <Button>
              <ExternalLink className="mr-2 h-4 w-4" />
              지원 요청
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 단축키 */}
      <Card>
        <CardHeader>
          <CardTitle>키보드 단축키</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {[
              { key: '⌘ + K', desc: '전역 검색' },
              { key: '⌘ + N', desc: '새로 만들기' },
              { key: '⌘ + S', desc: '저장' },
              { key: 'ESC', desc: '닫기' },
              { key: '?', desc: '단축키 보기' },
              { key: 'G + H', desc: '홈으로 이동' },
            ].map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-muted-foreground">{shortcut.desc}</span>
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
