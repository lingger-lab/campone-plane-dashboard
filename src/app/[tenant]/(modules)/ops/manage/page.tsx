'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  MoreVertical,
  Calendar,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TaskStatus = 'todo' | 'in_progress' | 'done';

interface Task {
  id: string;
  title: string;
  assignee: string;
  due: string;
  status: TaskStatus;
  priority: 'high' | 'medium' | 'low';
}

const initialTasks: Task[] = [
  { id: '1', title: '연설문 점검', assignee: '박매니저', due: '01/09', status: 'in_progress', priority: 'high' },
  { id: '2', title: '타운홀 리스크 체크', assignee: '이스태프', due: '01/10', status: 'todo', priority: 'high' },
  { id: '3', title: 'SNS 콘텐츠 제작', assignee: '김스태프', due: '01/11', status: 'in_progress', priority: 'medium' },
  { id: '4', title: '경제 공약 검토', assignee: '박매니저', due: '01/12', status: 'todo', priority: 'medium' },
  { id: '5', title: '자원봉사자 연락', assignee: '최스태프', due: '01/08', status: 'done', priority: 'low' },
  { id: '6', title: '출정식 현수막 디자인', assignee: '김스태프', due: '01/15', status: 'todo', priority: 'high' },
  { id: '7', title: '후원금 정산', assignee: '박매니저', due: '01/10', status: 'in_progress', priority: 'high' },
  { id: '8', title: '여론 조사 분석', assignee: '박매니저', due: '01/11', status: 'todo', priority: 'medium' },
  { id: '9', title: 'A/B 테스트 완료', assignee: '최스태프', due: '01/09', status: 'done', priority: 'medium' },
  { id: '10', title: '정책 브리핑 자료', assignee: '이스태프', due: '01/14', status: 'todo', priority: 'low' },
];

const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-primary" />;
    case 'todo':
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'high':
      return <Badge variant="danger">긴급</Badge>;
    case 'medium':
      return <Badge variant="warning">보통</Badge>;
    case 'low':
      return <Badge variant="secondary">낮음</Badge>;
    default:
      return null;
  }
};

export default function OpsManagePage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const columns: { status: TaskStatus; title: string }[] = [
    { status: 'todo', title: '할 일' },
    { status: 'in_progress', title: '진행중' },
    { status: 'done', title: '완료' },
  ];

  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const completionRate = Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/${tenant}/ops`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ops 관리</h1>
            <p className="text-muted-foreground">캠프 운영 태스크 관리</p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          새 태스크
        </Button>
      </div>

      {/* KPI 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className={cn(
              'text-3xl font-bold',
              completionRate >= 70 ? 'text-success' : 'text-warning'
            )}>
              {completionRate}%
            </div>
            <div className="text-sm text-muted-foreground">완료율</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">{getTasksByStatus('todo').length}</div>
            <div className="text-sm text-muted-foreground">할 일</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">
              {getTasksByStatus('in_progress').length}
            </div>
            <div className="text-sm text-muted-foreground">진행중</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-success">{completedCount}</div>
            <div className="text-sm text-muted-foreground">완료</div>
          </CardContent>
        </Card>
      </div>

      {/* 칸반 보드 */}
      <div className="grid md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.status} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{column.title}</h3>
              <Badge variant="outline">{getTasksByStatus(column.status).length}</Badge>
            </div>

            <div className="space-y-3">
              {getTasksByStatus(column.status).map((task) => (
                <Card key={task.id} className="card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(task.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium truncate">{task.title}</h4>
                          {getPriorityBadge(task.priority)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assignee}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {task.due}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {getTasksByStatus(column.status).length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  태스크 없음
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
