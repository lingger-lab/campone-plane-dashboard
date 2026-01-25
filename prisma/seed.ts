import dotenv from "dotenv";
// Load environment variables before importing Prisma
dotenv.config({ path: ".env.local" });

import { PrismaClient, UserRole, AlertType, AlertSeverity } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Users
  const hashedPassword = await bcrypt.hash("campone123!", 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@campone.kr" },
      update: {},
      create: {
        id: "user001",
        email: "admin@campone.kr",
        name: "김관리",
        password: hashedPassword,
        role: UserRole.Admin,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: "manager@campone.kr" },
      update: {},
      create: {
        id: "user002",
        email: "manager@campone.kr",
        name: "박매니저",
        password: hashedPassword,
        role: UserRole.Manager,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: "staff@campone.kr" },
      update: {},
      create: {
        id: "user003",
        email: "staff@campone.kr",
        name: "이스태프",
        password: hashedPassword,
        role: UserRole.Staff,
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Alerts
  const alerts = await Promise.all([
    prisma.alert.upsert({
      where: { id: "alert001" },
      update: {},
      create: {
        id: "alert001",
        type: AlertType.system,
        severity: AlertSeverity.info,
        title: "시스템 점검 예정",
        message: "1월 15일 오전 2시~4시 시스템 점검이 예정되어 있습니다.",
        pinned: false,
        createdAt: new Date("2025-01-10T09:00:00+09:00"),
      },
    }),
    prisma.alert.upsert({
      where: { id: "alert002" },
      update: {},
      create: {
        id: "alert002",
        type: AlertType.workflow,
        severity: AlertSeverity.warning,
        title: "메시지 발송 승인 대기",
        message: "타운홀 초대 메시지가 승인 대기 중입니다.",
        pinned: true,
        createdAt: new Date("2025-01-09T14:30:00+09:00"),
      },
    }),
    prisma.alert.upsert({
      where: { id: "alert003" },
      update: {},
      create: {
        id: "alert003",
        type: AlertType.workflow,
        severity: AlertSeverity.success,
        title: "캠페인 발송 완료",
        message: "공약 안내 캠페인이 성공적으로 발송되었습니다. (1,480명)",
        pinned: false,
        createdAt: new Date("2025-01-05T14:05:00+09:00"),
      },
    }),
    prisma.alert.upsert({
      where: { id: "alert004" },
      update: {},
      create: {
        id: "alert004",
        type: AlertType.system,
        severity: AlertSeverity.error,
        title: "API 연결 오류",
        message: "Naver 트렌드 API 연결에 실패했습니다. 재시도 중...",
        pinned: false,
        createdAt: new Date("2025-01-10T08:45:00+09:00"),
      },
    }),
    prisma.alert.upsert({
      where: { id: "alert005" },
      update: {},
      create: {
        id: "alert005",
        type: AlertType.workflow,
        severity: AlertSeverity.info,
        title: "새 태스크 할당",
        message: "출정식 현수막 디자인 태스크가 할당되었습니다.",
        pinned: false,
        createdAt: new Date("2025-01-10T10:00:00+09:00"),
      },
    }),
    prisma.alert.upsert({
      where: { id: "alert006" },
      update: {},
      create: {
        id: "alert006",
        type: AlertType.workflow,
        severity: AlertSeverity.warning,
        title: "여론 급증 감지",
        message: "SNS 멘션이 전일 대비 25% 증가했습니다. 확인이 필요합니다.",
        pinned: true,
        createdAt: new Date("2025-01-10T07:30:00+09:00"),
      },
    }),
  ]);

  console.log(`Created ${alerts.length} alerts`);

  // User Alerts (link users to alerts)
  await prisma.userAlert.createMany({
    data: [
      { userId: "user001", alertId: "alert001", read: false },
      { userId: "user001", alertId: "alert002", read: false },
      { userId: "user001", alertId: "alert003", read: true, readAt: new Date("2025-01-05T15:00:00+09:00") },
      { userId: "user001", alertId: "alert004", read: false },
      { userId: "user001", alertId: "alert005", read: false },
      { userId: "user001", alertId: "alert006", read: false },
      { userId: "user002", alertId: "alert002", read: false },
      { userId: "user002", alertId: "alert003", read: true, readAt: new Date("2025-01-05T16:00:00+09:00") },
      { userId: "user003", alertId: "alert005", read: false },
    ],
    skipDuplicates: true,
  });

  console.log("Created user alerts");

  // Channel Links
  const channelLinks = await Promise.all([
    prisma.channelLink.upsert({
      where: { key: "youtube" },
      update: {},
      create: {
        key: "youtube",
        url: "https://www.youtube.com/@CampOne-w9p",
        label: "YouTube",
        visible: true,
        order: 1,
      },
    }),
    prisma.channelLink.upsert({
      where: { key: "kakao" },
      update: {},
      create: {
        key: "kakao",
        url: "https://open.kakao.com/o/gQ9XBl9h",
        label: "KakaoTalk 채널",
        visible: true,
        order: 2,
      },
    }),
    prisma.channelLink.upsert({
      where: { key: "instagram" },
      update: {},
      create: {
        key: "instagram",
        url: "https://instagram.com/hongdemo",
        label: "Instagram",
        visible: true,
        order: 3,
      },
    }),
    prisma.channelLink.upsert({
      where: { key: "naverBlog" },
      update: {},
      create: {
        key: "naverBlog",
        url: "https://blog.naver.com/nineuri/224131041233",
        label: "Naver Blog",
        visible: true,
        order: 4,
      },
    }),
    prisma.channelLink.upsert({
      where: { key: "bannerDesigner" },
      update: {},
      create: {
        key: "bannerDesigner",
        url: "/studio/banners",
        label: "현수막 디자인",
        visible: true,
        order: 5,
      },
    }),
  ]);

  console.log(`Created ${channelLinks.length} channel links`);

  // Audit Logs
  const auditLogs = await Promise.all([
    prisma.auditLog.upsert({
      where: { id: "log001" },
      update: {},
      create: {
        id: "log001",
        userId: "user001",
        userName: "김관리",
        action: "create",
        module: "Hub",
        target: "세그먼트: 서울 지지자",
        details: { segmentId: "s001", size: 1240 },
        createdAt: new Date("2025-01-08T09:00:00+09:00"),
      },
    }),
    prisma.auditLog.upsert({
      where: { id: "log002" },
      update: {},
      create: {
        id: "log002",
        userId: "user002",
        userName: "박매니저",
        action: "update",
        module: "Studio",
        target: "연설문 초안 v2",
        details: { field: "content", changeType: "edit" },
        createdAt: new Date("2025-01-08T11:30:00+09:00"),
      },
    }),
    prisma.auditLog.upsert({
      where: { id: "log003" },
      update: {},
      create: {
        id: "log003",
        userId: "user001",
        userName: "김관리",
        action: "send",
        module: "Hub",
        target: "캠페인: 공약 안내",
        details: { campaignId: "cmp002", recipients: 1500, channel: "kakao" },
        createdAt: new Date("2025-01-05T14:00:00+09:00"),
      },
    }),
    prisma.auditLog.upsert({
      where: { id: "log004" },
      update: {},
      create: {
        id: "log004",
        userId: "user003",
        userName: "이스태프",
        action: "create",
        module: "Studio",
        target: "SNS 카드: 청년 정책",
        details: { assetId: "a006", template: "카드 템플릿 A" },
        createdAt: new Date("2025-01-09T15:20:00+09:00"),
      },
    }),
    prisma.auditLog.upsert({
      where: { id: "log005" },
      update: {},
      create: {
        id: "log005",
        userId: "user002",
        userName: "박매니저",
        action: "approve",
        module: "Policy",
        target: "공약: 청년 일자리 정책",
        details: { policyId: "p003", status: "approved" },
        createdAt: new Date("2025-01-09T16:45:00+09:00"),
      },
    }),
    prisma.auditLog.upsert({
      where: { id: "log006" },
      update: {},
      create: {
        id: "log006",
        userId: "user001",
        userName: "김관리",
        action: "update",
        module: "System",
        target: "채널 링크: YouTube",
        details: {
          field: "url",
          oldValue: "https://youtube.com/@oldhong",
          newValue: "https://youtube.com/@hongdemo",
        },
        createdAt: new Date("2025-01-10T09:15:00+09:00"),
      },
    }),
    prisma.auditLog.upsert({
      where: { id: "log007" },
      update: {},
      create: {
        id: "log007",
        userId: "user003",
        userName: "이스태프",
        action: "create",
        module: "Ops",
        target: "태스크: 출정식 현수막 디자인",
        details: { taskId: "t006", assignee: "staff1", due: "2025-01-15" },
        createdAt: new Date("2025-01-10T10:00:00+09:00"),
      },
    }),
    prisma.auditLog.upsert({
      where: { id: "log008" },
      update: {},
      create: {
        id: "log008",
        userId: "user002",
        userName: "박매니저",
        action: "delete",
        module: "Hub",
        target: "연락처: 테스트 계정",
        details: { contactId: "c_test", reason: "중복 제거" },
        createdAt: new Date("2025-01-10T10:30:00+09:00"),
      },
    }),
  ]);

  console.log(`Created ${auditLogs.length} audit logs`);

  // KPI Cache (sample data)
  await prisma.kpiCache.upsert({
    where: { key: "dashboard_summary" },
    update: {
      value: {
        trendIndex: 72,
        trendChange: 5.2,
        sentimentPositive: 68,
        sentimentNeutral: 24,
        sentimentNegative: 8,
        totalContacts: 3240,
        activeSegments: 12,
        pendingMessages: 3,
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
    create: {
      key: "dashboard_summary",
      value: {
        trendIndex: 72,
        trendChange: 5.2,
        sentimentPositive: 68,
        sentimentNeutral: 24,
        sentimentNegative: 8,
        totalContacts: 3240,
        activeSegments: 12,
        pendingMessages: 3,
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  console.log("Created KPI cache");

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
