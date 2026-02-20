import dotenv from "dotenv";
// Load environment variables before importing Prisma
dotenv.config({ path: ".env.local" });

import { PrismaClient as SystemPrismaClient } from "@prisma/client";
import { PrismaClient as TenantPrismaClient } from "@prisma/client-tenant";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

// ============================================
// DB 클라이언트 생성
// ============================================

function createSystemClient(): SystemPrismaClient {
  const pool = new pg.Pool({
    connectionString:
      process.env.SYSTEM_DATABASE_URL || process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  return new SystemPrismaClient({ adapter });
}

function createTenantClient(connectionString: string): TenantPrismaClient {
  const pool = new pg.Pool({
    connectionString,
    ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  return new TenantPrismaClient({ adapter });
}

/**
 * DATABASE_URL에서 DB명만 교체하여 테넌트 DB URL 생성
 */
function deriveTenantDbUrl(dbName: string): string {
  const baseUrl =
    process.env.SYSTEM_DATABASE_URL || process.env.DATABASE_URL || "";
  return baseUrl.replace(/\/([^/?]+)(\?|$)/, `/${dbName}$2`);
}

const systemDb = createSystemClient();

// 테넌트 클라이언트: TENANT_DATABASE_URL 있으면 그걸로 camp_dev_db 접속,
// 없으면 DATABASE_URL에서 DB명 교체
const campDevUrl =
  process.env.TENANT_DATABASE_URL || deriveTenantDbUrl("camp_dev_db");
const campTestUrl =
  process.env.CAMP_TEST_DATABASE_URL || deriveTenantDbUrl("camp_test_db");

const campDevDb = createTenantClient(campDevUrl);
const campTestDb = createTenantClient(campTestUrl);

// ============================================
// 시스템 DB 시드 (campone_system)
// ============================================

async function seedSystemDb() {
  console.log("📦 Seeding system DB (campone_system)...");

  const hashedPassword = await bcrypt.hash("campone123!", 10);

  // 테넌트 등록
  await systemDb.tenant.upsert({
    where: { tenantId: "camp-dev" },
    update: { dbName: "camp_dev_db" },
    create: {
      tenantId: "camp-dev",
      name: "개발용 캠프",
      dbName: "camp_dev_db",
      isActive: true,
      configPath: "tenants/camp-dev.yaml",
    },
  });

  await systemDb.tenant.upsert({
    where: { tenantId: "camp-test" },
    update: { dbName: "camp_test_db" },
    create: {
      tenantId: "camp-test",
      name: "테스트 캠프",
      dbName: "camp_test_db",
      isActive: true,
      configPath: "tenants/camp-test.yaml",
    },
  });

  console.log("  [v] tenants: camp-dev, camp-test");

  // ---- 사용자 생성 (시스템 DB) ----

  const admin = await systemDb.user.upsert({
    where: { email: "admin@campone.kr" },
    update: {},
    create: {
      email: "admin@campone.kr",
      name: "김관리",
      passwordHash: hashedPassword,
      isActive: true,
      isSystemAdmin: true,
    },
  });

  const analyst = await systemDb.user.upsert({
    where: { email: "analyst@campone.kr" },
    update: {},
    create: {
      email: "analyst@campone.kr",
      name: "박분석",
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  const operator = await systemDb.user.upsert({
    where: { email: "operator@campone.kr" },
    update: {},
    create: {
      email: "operator@campone.kr",
      name: "최운영",
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  const contentMgr = await systemDb.user.upsert({
    where: { email: "content@campone.kr" },
    update: {},
    create: {
      email: "content@campone.kr",
      name: "정콘텐",
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  const member = await systemDb.user.upsert({
    where: { email: "member@campone.kr" },
    update: {},
    create: {
      email: "member@campone.kr",
      name: "이멤버",
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  // camp-test 전용 사용자
  const testAdmin = await systemDb.user.upsert({
    where: { email: "testadmin@campone.kr" },
    update: {},
    create: {
      email: "testadmin@campone.kr",
      name: "테스트관리자",
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  const testMember = await systemDb.user.upsert({
    where: { email: "testmember@campone.kr" },
    update: {},
    create: {
      email: "testmember@campone.kr",
      name: "테스트멤버",
      passwordHash: hashedPassword,
      isActive: true,
    },
  });

  console.log("  [v] users: 7 accounts");

  // ---- 사용자-테넌트 매핑 (N:N) ----
  const mappings = [
    // camp-dev 멤버
    { userId: admin.id, tenantId: "camp-dev", role: "admin", isDefault: true },
    {
      userId: analyst.id,
      tenantId: "camp-dev",
      role: "editor",
      isDefault: true,
    },
    {
      userId: operator.id,
      tenantId: "camp-dev",
      role: "editor",
      isDefault: true,
    },
    {
      userId: contentMgr.id,
      tenantId: "camp-dev",
      role: "editor",
      isDefault: true,
    },
    {
      userId: member.id,
      tenantId: "camp-dev",
      role: "viewer",
      isDefault: true,
    },

    // camp-test 멤버
    {
      userId: admin.id,
      tenantId: "camp-test",
      role: "admin",
      isDefault: false,
    },
    {
      userId: testAdmin.id,
      tenantId: "camp-test",
      role: "admin",
      isDefault: true,
    },
    {
      userId: testMember.id,
      tenantId: "camp-test",
      role: "viewer",
      isDefault: true,
    },
    {
      userId: analyst.id,
      tenantId: "camp-test",
      role: "editor",
      isDefault: false,
    },
  ];

  for (const mapping of mappings) {
    await systemDb.userTenant.upsert({
      where: {
        userId_tenantId: {
          userId: mapping.userId,
          tenantId: mapping.tenantId,
        },
      },
      update: {},
      create: mapping,
    });
  }

  console.log("  [v] user-tenant mappings: camp-dev(5), camp-test(4)");

  // ---- 감사 로그 샘플 ----
  await systemDb.auditLog.create({
    data: {
      actorId: admin.id,
      tenantId: "camp-dev",
      action: "create",
      resource: "세그먼트: 서울 지지자",
      detail: { module: "Hub", segmentId: "s001", size: 1240 },
    },
  });

  await systemDb.auditLog.create({
    data: {
      actorId: analyst.id,
      tenantId: "camp-dev",
      action: "update",
      resource: "연설문 초안 v2",
      detail: { module: "Studio", field: "content", changeType: "edit" },
    },
  });

  await systemDb.auditLog.create({
    data: {
      actorId: testAdmin.id,
      tenantId: "camp-test",
      action: "create",
      resource: "캠페인 프로필 설정",
      detail: { module: "Settings", type: "profile_init" },
    },
  });

  console.log("  [v] audit logs: 3 entries");
}

// ============================================
// camp-dev 테넌트 DB 시드 (camp_dev_db)
// - 홍길동 / 창원시장 후보
// ============================================

async function seedCampDev() {
  console.log("\n📦 Seeding camp-dev tenant DB (camp_dev_db)...");

  // 알림
  const alerts = await Promise.all([
    campDevDb.alert.create({
      data: {
        type: "system",
        severity: "info",
        title: "시스템 점검 예정",
        message: "1월 15일 오전 2시~4시 시스템 점검이 예정되어 있습니다.",
        pinned: false,
      },
    }),
    campDevDb.alert.create({
      data: {
        type: "workflow",
        severity: "warning",
        title: "메시지 발송 승인 대기",
        message: "타운홀 초대 메시지가 승인 대기 중입니다.",
        pinned: true,
      },
    }),
    campDevDb.alert.create({
      data: {
        type: "workflow",
        severity: "success",
        title: "캠페인 발송 완료",
        message: "공약 안내 캠페인이 성공적으로 발송되었습니다. (1,480명)",
        pinned: false,
      },
    }),
    campDevDb.alert.create({
      data: {
        type: "system",
        severity: "error",
        title: "API 연결 오류",
        message: "Naver 트렌드 API 연결에 실패했습니다. 재시도 중...",
        pinned: false,
      },
    }),
  ]);
  console.log(`  [v] alerts: ${alerts.length}`);

  // 채널 링크
  const channelLinks = await Promise.all([
    campDevDb.channelLink.upsert({
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
    campDevDb.channelLink.upsert({
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
    campDevDb.channelLink.upsert({
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
    campDevDb.channelLink.upsert({
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
  ]);
  console.log(`  [v] channel links: ${channelLinks.length}`);

  // KPI 캐시
  await campDevDb.kpiCache.upsert({
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
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
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
  console.log("  [v] KPI cache");

  // 캠페인 프로필 (홍길동 / 창원시장)
  await campDevDb.campaignProfile.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      candidateName: "홍길동",
      candidateTitle: "창원시장 후보",
      orgName: "홍길동 선거대책본부",
      photoUrl: "/candidate.png",
      careers: [
        { icon: "Briefcase", text: "前 국회의원" },
        { icon: "GraduationCap", text: "서울대학교 행정학과" },
        { icon: "Users", text: "시민단체 대표" },
      ],
      slogans: ["시민과 함께", "더 나은 창원", "미래를 향해"],
      address: "경남 창원시 성산구 중앙대로 200",
      phone: "055-123-4567",
      email: "hong@campaign.kr",
      hours: "09:00 - 18:00",
      description:
        "30년간 지역 발전에 헌신해온 경험을 바탕으로, 시민 중심의 새로운 창원을 만들어가겠습니다.",
    },
  });
  console.log("  [v] campaign profile: 홍길동 (창원시장 후보)");

  // 퀵 버튼
  await Promise.all([
    campDevDb.quickButton.create({
      data: {
        label: "유튜브 채널",
        url: "https://www.youtube.com/@CampOne-w9p",
        icon: "Youtube",
        category: "video",
        order: 1,
      },
    }),
    campDevDb.quickButton.create({
      data: {
        label: "공약집 다운로드",
        url: "/files/pledges.pdf",
        icon: "FileText",
        category: "primary",
        order: 2,
      },
    }),
    campDevDb.quickButton.create({
      data: {
        label: "후원하기",
        url: "https://donate.example.com",
        icon: "Heart",
        category: "primary",
        order: 3,
      },
    }),
  ]);
  console.log("  [v] quick buttons: 3");
}

// ============================================
// camp-test 테넌트 DB 시드 (camp_test_db)
// - 김민주 / 부산시장 후보
// ============================================

async function seedCampTest() {
  console.log("\n📦 Seeding camp-test tenant DB (camp_test_db)...");

  // 알림
  const alerts = await Promise.all([
    campTestDb.alert.create({
      data: {
        type: "system",
        severity: "info",
        title: "대시보드 초기 설정 완료",
        message:
          "캠프 대시보드가 성공적으로 설정되었습니다. 각 모듈을 확인해주세요.",
        pinned: true,
      },
    }),
    campTestDb.alert.create({
      data: {
        type: "workflow",
        severity: "warning",
        title: "SNS 연동 필요",
        message:
          "Instagram, YouTube 등 SNS 채널 연동이 아직 완료되지 않았습니다.",
        pinned: false,
      },
    }),
    campTestDb.alert.create({
      data: {
        type: "workflow",
        severity: "success",
        title: "여론 분석 리포트 생성",
        message: "1월 3주차 여론 분석 리포트가 자동 생성되었습니다.",
        pinned: false,
      },
    }),
  ]);
  console.log(`  [v] alerts: ${alerts.length}`);

  // 채널 링크
  const channelLinks = await Promise.all([
    campTestDb.channelLink.upsert({
      where: { key: "youtube" },
      update: {},
      create: {
        key: "youtube",
        url: "https://www.youtube.com/@kimminju-test",
        label: "YouTube",
        visible: true,
        order: 1,
      },
    }),
    campTestDb.channelLink.upsert({
      where: { key: "kakao" },
      update: {},
      create: {
        key: "kakao",
        url: "https://open.kakao.com/o/test-channel",
        label: "KakaoTalk 채널",
        visible: true,
        order: 2,
      },
    }),
    campTestDb.channelLink.upsert({
      where: { key: "instagram" },
      update: {},
      create: {
        key: "instagram",
        url: "https://instagram.com/kimminju_test",
        label: "Instagram",
        visible: true,
        order: 3,
      },
    }),
    campTestDb.channelLink.upsert({
      where: { key: "naverBlog" },
      update: {},
      create: {
        key: "naverBlog",
        url: "https://blog.naver.com/kimminju-test",
        label: "Naver Blog",
        visible: true,
        order: 4,
      },
    }),
  ]);
  console.log(`  [v] channel links: ${channelLinks.length}`);

  // KPI 캐시
  await campTestDb.kpiCache.upsert({
    where: { key: "dashboard_summary" },
    update: {
      value: {
        trendIndex: 58,
        trendChange: -2.1,
        sentimentPositive: 52,
        sentimentNeutral: 31,
        sentimentNegative: 17,
        totalContacts: 1820,
        activeSegments: 7,
        pendingMessages: 1,
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
    create: {
      key: "dashboard_summary",
      value: {
        trendIndex: 58,
        trendChange: -2.1,
        sentimentPositive: 52,
        sentimentNeutral: 31,
        sentimentNegative: 17,
        totalContacts: 1820,
        activeSegments: 7,
        pendingMessages: 1,
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  console.log("  [v] KPI cache");

  // 캠페인 프로필 (김민주 / 부산시장)
  await campTestDb.campaignProfile.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      candidateName: "김민주",
      candidateTitle: "부산시장 후보",
      orgName: "김민주 선거캠프",
      photoUrl: "/candidate-test.png",
      careers: [
        { icon: "Briefcase", text: "前 부산시 부시장" },
        { icon: "GraduationCap", text: "부산대학교 행정학과" },
        { icon: "Building2", text: "부산상공회의소 부회장" },
        { icon: "Globe", text: "UN 해비타트 한국위원회 위원" },
      ],
      slogans: ["부산을 다시 뛰게", "해양 수도의 꿈", "시민이 주인"],
      address: "부산시 해운대구 센텀중앙로 79",
      phone: "051-987-6543",
      email: "kim@testcamp.kr",
      hours: "09:00 - 21:00",
      description:
        "해양 도시 부산의 잠재력을 끌어내어, 글로벌 도시로 도약하는 비전을 제시합니다.",
    },
  });
  console.log("  [v] campaign profile: 김민주 (부산시장 후보)");

  // 퀵 버튼
  await Promise.all([
    campTestDb.quickButton.create({
      data: {
        label: "유튜브 채널",
        url: "https://www.youtube.com/@kimminju-test",
        icon: "Youtube",
        category: "video",
        order: 1,
      },
    }),
    campTestDb.quickButton.create({
      data: {
        label: "공약 보기",
        url: "/files/pledges-busan.pdf",
        icon: "FileText",
        category: "primary",
        order: 2,
      },
    }),
    campTestDb.quickButton.create({
      data: {
        label: "자원봉사 신청",
        url: "https://volunteer.example.com",
        icon: "HandHeart",
        category: "primary",
        order: 3,
      },
    }),
    campTestDb.quickButton.create({
      data: {
        label: "네이버 블로그",
        url: "https://blog.naver.com/kimminju-test",
        icon: "BookOpen",
        category: "blog",
        order: 4,
      },
    }),
  ]);
  console.log("  [v] quick buttons: 4");
}

// ============================================
// 메인
// ============================================

async function main() {
  const target = process.argv[2]; // "system", "camp-dev", "camp-test", or undefined (all)

  console.log("=== CampOne v1.4 Seed Start ===");
  console.log(`Target: ${target || "all"}\n`);

  if (!target || target === "system") {
    await seedSystemDb();
  }

  if (!target || target === "camp-dev") {
    await seedCampDev();
  }

  if (!target || target === "camp-test") {
    await seedCampTest();
  }

  console.log("\n=== Seeding completed! ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await systemDb.$disconnect();
    await campDevDb.$disconnect();
    await campTestDb.$disconnect();
  });
