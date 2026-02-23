'use client';

import type { QuestionSource } from '@/hooks/useHelpChat';
import { FileText } from 'lucide-react';

interface HelpChatSourcesProps {
  sources: QuestionSource[];
}

export function HelpChatSources({ sources }: HelpChatSourcesProps) {
  if (sources.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">참고 문서</p>
      <div className="space-y-1.5">
        {sources.map((source, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 rounded-lg border bg-muted/50 p-2.5 text-xs"
          >
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{source.documentName}</span>
                <span className="shrink-0 text-muted-foreground">
                  {source.relevanceScore}%
                </span>
              </div>
              {source.excerpt && (
                <p className="mt-1 line-clamp-2 text-muted-foreground">
                  {source.excerpt}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
