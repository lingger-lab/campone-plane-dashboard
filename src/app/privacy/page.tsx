'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* 간단한 헤더 */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container max-w-4xl mx-auto flex items-center gap-4 px-6 py-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/camponelogo.svg"
              alt="CampOne"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </Link>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-6 py-12">
        {/* 헤더 */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-4">개인정보처리방침</h1>
          <p className="text-muted-foreground">
            최종 수정일: 2025년 1월 1일
          </p>
        </div>

        {/* 본문 */}
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. 개인정보의 처리 목적</h2>
            <p className="text-muted-foreground leading-relaxed">
              캠프원 서비스 운영자(이하 &quot;본부&quot;)는 다음의 목적을 위하여 개인정보를 처리합니다.
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며,
              이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>선거 캠페인 관련 정보 제공</li>
              <li>시민 의견 수렴 및 정책 반영</li>
              <li>선거 관련 뉴스레터 및 소식 전달</li>
              <li>민원 처리 및 문의 응대</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. 개인정보의 처리 및 보유 기간</h2>
            <p className="text-muted-foreground leading-relaxed">
              본부는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를
              수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>선거 종료 후 3개월까지 보유</li>
              <li>법령에 따른 보존 의무가 있는 경우 해당 기간까지 보유</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. 처리하는 개인정보의 항목</h2>
            <p className="text-muted-foreground leading-relaxed">
              본부는 다음의 개인정보 항목을 처리하고 있습니다.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>필수항목: 이름, 연락처(전화번호 또는 이메일)</li>
              <li>선택항목: 주소, 직업, 관심 정책 분야</li>
              <li>자동수집항목: IP 주소, 접속 로그, 브라우저 정보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. 개인정보의 제3자 제공</h2>
            <p className="text-muted-foreground leading-relaxed">
              본부는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다.
              다만, 다음의 경우에는 예외로 합니다.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>정보주체가 사전에 동의한 경우</li>
              <li>법령에 의해 제공이 요구되는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. 개인정보의 파기</h2>
            <p className="text-muted-foreground leading-relaxed">
              본부는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는
              지체없이 해당 개인정보를 파기합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. 정보주체의 권리·의무</h2>
            <p className="text-muted-foreground leading-relaxed">
              정보주체는 본부에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리정지 요구</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. 개인정보 보호책임자</h2>
            <div className="bg-muted/50 rounded-lg p-6 text-muted-foreground">
              <p><strong>개인정보 보호책임자</strong></p>
              <p className="mt-2">성명: 홍길동</p>
              <p>직책: 선거대책본부 사무국장</p>
              <p>연락처: 055-123-4567</p>
              <p>이메일: privacy@hongdemo.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. 개인정보 처리방침 변경</h2>
            <p className="text-muted-foreground leading-relaxed">
              이 개인정보처리방침은 2025년 1월 1일부터 적용되며,
              법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는
              변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>
        </div>
      </main>

      {/* 간단한 푸터 */}
      <footer className="border-t py-8 mt-12">
        <div className="container max-w-4xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 CampOne. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
