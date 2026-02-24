/**
 * Next.js Instrumentation
 * 서버 시작 시 1회 실행 — graceful shutdown 핸들러 등록
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { disconnectAll } = await import('@/lib/prisma');

    const shutdown = async (signal: string) => {
      console.log(`[shutdown] ${signal} received, closing DB connections...`);
      await disconnectAll();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}
