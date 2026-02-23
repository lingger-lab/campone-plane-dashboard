'use client';

import { useState, useCallback, useRef } from 'react';

export interface QuestionSource {
  documentName: string;
  documentDate: string;
  excerpt?: string;
  relevanceScore: number;
}

export interface StreamingAnswer {
  questionText: string;
  sources: QuestionSource[];
  content: string;
  phase: 'quick' | 'detailed';
  isStreaming: boolean;
  isComplete: boolean;
  error: string | null;
  questionId: string | null;
}

const INITIAL_STATE: StreamingAnswer = {
  questionText: '',
  sources: [],
  content: '',
  phase: 'quick',
  isStreaming: false,
  isComplete: false,
  error: null,
  questionId: null,
};

export function useHelpChat() {
  const [answer, setAnswer] = useState<StreamingAnswer>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback(async (questionText: string, phase: 'quick' | 'detailed' = 'quick') => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAnswer({
      ...INITIAL_STATE,
      questionText,
      phase,
      isStreaming: true,
    });

    try {
      const response = await fetch('/api/help/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText, phase }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(line.slice(6));

            switch (event.type) {
              case 'meta':
                setAnswer((prev) => ({
                  ...prev,
                  sources: event.sources,
                  phase: event.phase || prev.phase,
                }));
                break;
              case 'chunk':
                setAnswer((prev) => ({
                  ...prev,
                  content: prev.content + event.content,
                }));
                break;
              case 'done':
                setAnswer((prev) => ({
                  ...prev,
                  isStreaming: false,
                  isComplete: true,
                  questionId: event.questionId || null,
                }));
                break;
              case 'error':
                setAnswer((prev) => ({
                  ...prev,
                  isStreaming: false,
                  error: event.error,
                }));
                break;
            }
          } catch {
            // JSON parse error — skip malformed line
          }
        }
      }

      // Stream ended without explicit done event
      setAnswer((prev) => {
        if (prev.isStreaming) {
          return { ...prev, isStreaming: false, isComplete: true };
        }
        return prev;
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;

      setAnswer((prev) => ({
        ...prev,
        isStreaming: false,
        error: '서버와 연결할 수 없습니다.',
      }));
    }
  }, []);

  const askDetailed = useCallback(
    (questionText: string) => ask(questionText, 'detailed'),
    [ask],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setAnswer(INITIAL_STATE);
  }, []);

  return { answer, ask, askDetailed, reset };
}
