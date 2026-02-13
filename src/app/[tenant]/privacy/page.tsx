'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenantPreference } from '@/hooks/useTenantPreference';
import { DEFAULT_PRIVACY } from '@/lib/legal-defaults';
import type { LegalDocument } from '@/lib/legal-defaults';

export default function PrivacyPage() {
  const { data, isLoading } = useTenantPreference<LegalDocument>('privacy_content');
  const doc = data || DEFAULT_PRIVACY;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-4">개인정보처리방침</h1>
          <p className="text-muted-foreground">
            최종 수정일: {doc.lastUpdated}
          </p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          {doc.sections.map((section, idx) => (
            <section key={idx}>
              <h2 className="text-xl font-semibold mb-4">{section.heading}</h2>
              {section.content && (
                <p className="text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              )}
              {section.items && section.items.length > 0 && (
                <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {doc.contactInfo && (
            <section>
              <h2 className="text-xl font-semibold mb-4">개인정보 보호책임자</h2>
              <div className="bg-muted/50 rounded-lg p-6 text-muted-foreground">
                <p><strong>개인정보 보호책임자</strong></p>
                <p className="mt-2">성명: {doc.contactInfo.name}</p>
                <p>직책: {doc.contactInfo.position}</p>
                <p>연락처: {doc.contactInfo.phone}</p>
                <p>이메일: {doc.contactInfo.email}</p>
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="border-t py-8 mt-12">
        <div className="container max-w-4xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CampOne. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
