/**
 * CampOne 관리자 대시보드 - 포맷터 유틸리티
 */

/**
 * 숫자를 한국어 단위로 포맷팅
 * @example formatNumber(1234567) => "1,234,567"
 * @example formatNumber(1234567, true) => "123만"
 */
export function formatNumber(value: number, compact: boolean = false): string {
  if (compact) {
    if (value >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억`;
    }
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}만`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}천`;
    }
  }

  return new Intl.NumberFormat('ko-KR').format(value);
}

/**
 * 금액 포맷팅 (원화)
 * @example formatCurrency(1000000) => "1,000,000원"
 * @example formatCurrency(1000000, true) => "100만원"
 */
export function formatCurrency(value: number, compact: boolean = false): string {
  return `${formatNumber(value, compact)}원`;
}

/**
 * 퍼센트 포맷팅
 * @example formatPercent(0.456) => "45.6%"
 * @example formatPercent(45.6, false) => "45.6%"
 */
export function formatPercent(value: number, isDecimal: boolean = true): string {
  const percent = isDecimal ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}

/**
 * 변화율 포맷팅 (+ / - 기호 포함)
 * @example formatChange(12.5) => "+12.5%"
 * @example formatChange(-5.3) => "-5.3%"
 */
export function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * 날짜 포맷팅
 * @example formatDate('2025-01-10') => "2025년 1월 10일"
 * @example formatDate('2025-01-10', 'short') => "1/10"
 * @example formatDate('2025-01-10', 'relative') => "2일 전"
 */
export function formatDate(
  dateStr: string,
  format: 'full' | 'short' | 'relative' | 'iso' = 'full'
): string {
  const date = new Date(dateStr);

  switch (format) {
    case 'full':
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);

    case 'short':
      return new Intl.DateTimeFormat('ko-KR', {
        month: 'numeric',
        day: 'numeric',
      }).format(date);

    case 'relative':
      return formatRelativeTime(date);

    case 'iso':
      return date.toISOString().split('T')[0];

    default:
      return dateStr;
  }
}

/**
 * 상대 시간 포맷팅
 * @example formatRelativeTime(new Date(Date.now() - 3600000)) => "1시간 전"
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}개월 전`;

  return `${Math.floor(diffDay / 365)}년 전`;
}

/**
 * 날짜/시간 포맷팅
 * @example formatDateTime('2025-01-10T09:30:00+09:00') => "2025년 1월 10일 오전 9:30"
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * 전화번호 포맷팅
 * @example formatPhone('+821012345678') => "010-1234-5678"
 */
export function formatPhone(phone: string | null): string {
  if (!phone) return '-';

  // +82 제거 및 0 추가
  let cleaned = phone.replace(/^\+82/, '0').replace(/\D/g, '');

  // 포맷팅
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * 이름 포맷팅 (성 + 이름)
 * @example formatName('길동', '홍') => "홍길동"
 */
export function formatName(firstName: string, lastName: string): string {
  return `${lastName}${firstName}`;
}

/**
 * 지역 라벨 포맷팅
 */
export function formatRegion(region: string): string {
  const regionMap: Record<string, string> = {
    '서울': '서울특별시',
    '부산': '부산광역시',
    '대구': '대구광역시',
    '인천': '인천광역시',
    '광주': '광주광역시',
    '대전': '대전광역시',
    '울산': '울산광역시',
    '세종': '세종특별자치시',
    '경기': '경기도',
    '강원': '강원도',
    '충북': '충청북도',
    '충남': '충청남도',
    '전북': '전라북도',
    '전남': '전라남도',
    '경북': '경상북도',
    '경남': '경상남도',
    '제주': '제주특별자치도',
  };

  return regionMap[region] || region;
}

/**
 * 파일 크기 포맷팅
 * @example formatFileSize(1048576) => "1.0 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * 메시지 상태 라벨
 */
export function formatMessageStatus(status: string): string {
  const statusMap: Record<string, string> = {
    draft: '작성중',
    scheduled: '예약됨',
    sent: '발송완료',
    failed: '발송실패',
  };

  return statusMap[status] || status;
}

/**
 * 이벤트 상태 라벨
 */
export function formatEventStatus(status: string): string {
  const statusMap: Record<string, string> = {
    planning: '기획중',
    scheduled: '예정됨',
    completed: '완료',
    cancelled: '취소됨',
  };

  return statusMap[status] || status;
}

/**
 * 태스크 상태 라벨
 */
export function formatTaskStatus(status: string): string {
  const statusMap: Record<string, string> = {
    todo: '할 일',
    in_progress: '진행중',
    done: '완료',
  };

  return statusMap[status] || status;
}
