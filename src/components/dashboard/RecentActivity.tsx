'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RefreshCw, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useActivities, formatRelativeTime } from '@/hooks/useActivities';

export function RecentActivity() {
  const { data, isLoading, isError, refetch, isFetching } = useActivities(10);

  const activities = data?.activities || [];

  return (
    <motion.div
      className="rounded-2xl border bg-card/90 backdrop-blur-sm p-6"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">최근 활동</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 animate-pulse">
              <div className="h-2 w-2 rounded-full bg-muted" />
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-12 bg-muted rounded" />
              <div className="h-4 w-16 bg-muted rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">활동을 불러올 수 없습니다</p>
          <Button variant="link" size="sm" onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">아직 기록된 활동이 없습니다</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 max-h-[320px] overflow-y-auto">
            {activities.map((item) => (
              <motion.div
                key={item.id}
                className="flex items-center gap-2 text-sm whitespace-nowrap overflow-hidden"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                <span className="font-medium truncate min-w-0">{item.action}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {item.module}
                </Badge>
                <span className="text-muted-foreground truncate min-w-0">
                  {item.userName}
                </span>
                <span className="ml-auto text-muted-foreground shrink-0">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </motion.div>
            ))}
          </div>
          <Link
            href="/audit?tab=activities"
            className="flex items-center justify-center gap-1 mt-4 pt-3 border-t text-sm text-primary hover:underline"
          >
            모두 보기
            <ArrowRight className="h-3 w-3" />
          </Link>
        </>
      )}
    </motion.div>
  );
}