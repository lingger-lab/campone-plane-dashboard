'use client';

import { useHelpChat } from '@/hooks/useHelpChat';
import { HelpChatInput } from './HelpChatInput';
import { HelpChatSources } from './HelpChatSources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function HelpChatPanel() {
  const { answer, ask, askDetailed, reset } = useHelpChat();

  const hasAnswer = answer.content || answer.isStreaming || answer.error;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">AI 도움말 챗봇</CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              Beta
            </Badge>
          </div>
          {hasAnswer && (
            <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-xs">
              <RotateCcw className="mr-1 h-3 w-3" />
              초기화
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 질문 표시 */}
        {answer.questionText && (
          <div className="rounded-lg bg-muted p-3 text-sm">{answer.questionText}</div>
        )}

        {/* AI 답변 */}
        {(answer.content || answer.isStreaming) && (
          <div className="space-y-3">
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {answer.content}
              </ReactMarkdown>
              {answer.isStreaming && (
                <span className="inline-block animate-pulse text-primary">|</span>
              )}
            </div>

            {/* 소스 */}
            {answer.sources.length > 0 && !answer.isStreaming && (
              <HelpChatSources sources={answer.sources} />
            )}

            {/* 자세히 보기 버튼 */}
            {answer.isComplete && answer.phase === 'quick' && answer.questionText && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => askDetailed(answer.questionText)}
                className="text-xs"
              >
                자세히 보기
              </Button>
            )}
          </div>
        )}

        {/* 에러 */}
        {answer.error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {answer.error}
          </div>
        )}

        {/* 입력 */}
        <HelpChatInput onSubmit={(text) => ask(text)} disabled={answer.isStreaming} />
      </CardContent>
    </Card>
  );
}
