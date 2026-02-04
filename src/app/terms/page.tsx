'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold mb-4">이용약관</h1>
          <p className="text-muted-foreground">
            최종 수정일: 2025년 1월 1일
          </p>
        </div>

        {/* 본문 */}
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">제1조 (목적)</h2>
            <p className="text-muted-foreground leading-relaxed">
              이 약관은 유해남 후보 선거대책본부(이하 &quot;본부&quot;)가 제공하는 캠프원 대시보드 서비스(이하 &quot;서비스&quot;)의
              이용조건 및 절차, 본부와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">제2조 (용어의 정의)</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>서비스</strong>: 본부가 제공하는 선거 캠페인 관리 플랫폼</li>
              <li><strong>이용자</strong>: 본 약관에 따라 서비스를 이용하는 자</li>
              <li><strong>계정</strong>: 서비스 이용을 위해 이용자가 설정한 고유 식별정보</li>
              <li><strong>콘텐츠</strong>: 서비스 내에서 게시되는 모든 정보 및 자료</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력을 발생합니다.</li>
              <li>본부는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.</li>
              <li>변경된 약관은 공지와 동시에 그 효력이 발생합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">제4조 (서비스의 제공)</h2>
            <p className="text-muted-foreground leading-relaxed">
              본부는 다음과 같은 서비스를 제공합니다.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>여론 분석 및 인사이트 제공 (Insights)</li>
              <li>콘텐츠 제작 및 관리 (Studio)</li>
              <li>정책 연구 및 공약 관리 (Policy Lab)</li>
              <li>선거 운영 관리 (Ops)</li>
              <li>시민 소통 플랫폼 (Civic Hub)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">제5조 (이용자의 의무)</h2>
            <p className="text-muted-foreground leading-relaxed">
              이용자는 다음 행위를 하여서는 안 됩니다.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>허위 정보의 등록</li>
              <li>타인의 정보 도용</li>
              <li>본부 또는 제3자의 지적재산권 침해</li>
              <li>공직선거법 등 관련 법령 위반 행위</li>
              <li>서비스의 안정적 운영을 방해하는 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">제6조 (서비스 이용의 제한)</h2>
            <p className="text-muted-foreground leading-relaxed">
              본부는 이용자가 제5조의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우,
              서비스 이용을 제한하거나 중지할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">제7조 (저작권의 귀속)</h2>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>서비스에 포함된 콘텐츠의 저작권은 본부에 귀속됩니다.</li>
              <li>이용자가 서비스 내에 게시한 콘텐츠의 저작권은 해당 이용자에게 귀속됩니다.</li>
              <li>이용자는 본부에 자신이 게시한 콘텐츠를 서비스 운영 목적으로 사용할 수 있는 권리를 부여합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">제8조 (면책조항)</h2>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>본부는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
              <li>본부는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
              <li>본부는 이용자가 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">제9조 (분쟁 해결)</h2>
            <p className="text-muted-foreground leading-relaxed">
              본 약관에 명시되지 않은 사항은 관련 법령 및 상관례에 따르며,
              서비스 이용과 관련하여 분쟁이 발생한 경우 양 당사자 간의 합의에 의해 해결합니다.
              합의가 이루어지지 않는 경우 관할 법원에 소송을 제기할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">부칙</h2>
            <p className="text-muted-foreground leading-relaxed">
              이 약관은 2025년 1월 1일부터 시행합니다.
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
