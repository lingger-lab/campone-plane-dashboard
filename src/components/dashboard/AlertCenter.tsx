'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { RefreshCw, Check, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAlerts, useMarkAlertAsRead, getAlertStyles } from '@/hooks/useAlerts';
import { cn } from '@/lib/utils';

export function AlertCenter() {
  const { data, isLoading, isError, refetch, isFetching } = useAlerts(10);
  const markAsRead = useMarkAlertAsRead();

  const alerts = data?.alerts || [];
  const unreadCount = data?.unreadCount || 0;

  const handleMarkAsRead = (alertId: string) => {
    markAsRead.mutate(alertId);
  };

  return (
    <motion.div
      className="rounded-2xl border bg-card/90 backdrop-blur-sm p-6"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">알림</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
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
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg p-3 bg-muted">
              <div className="h-4 w-32 bg-muted-foreground/20 rounded mb-2" />
              <div className="h-3 w-48 bg-muted-foreground/20 rounded" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">알림을 불러올 수 없습니다</p>
          <Button variant="link" size="sm" onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">새로운 알림이 없습니다</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {alerts.map((alert) => {
              const styles = getAlertStyles(alert.severity);

              return (
                <motion.div
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-3 rounded-lg p-3 transition-opacity',
                    styles.bg,
                    alert.read && 'opacity-60'
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: alert.read ? 0.6 : 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={cn('mt-1 h-2 w-2 rounded-full shrink-0', styles.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.message}
                    </p>
                    {alert.source && (
                      <span className="text-xs text-muted-foreground">
                        from {alert.source}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {alert.pinned && (
                      <Badge variant="outline" className="text-xs">
                        고정
                      </Badge>
                    )}
                    {!alert.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleMarkAsRead(alert.id)}
                        title="읽음 처리"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          <Link
            href="/audit?tab=alerts"
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