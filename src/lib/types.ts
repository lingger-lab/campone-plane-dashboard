/**
 * CampOne 관리자 대시보드 - 타입 정의
 */

// ============================================
// Contact & Segment
// ============================================

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  region: string;
  tags: string[];
  optIn: boolean;
  createdAt: string; // ISO 8601
}

export interface SegmentCriteria {
  region?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface Segment {
  id: string;
  name: string;
  criteria: SegmentCriteria;
  size: number;
  updatedAt: string;
}

// ============================================
// Campaign & Message
// ============================================

export type MessageChannel = 'sms' | 'kakao' | 'email';
export type MessageStatus = 'draft' | 'scheduled' | 'sent' | 'failed';
export type ABGroup = 'A' | 'B' | null;

export interface MessageMetrics {
  sent: number;
  delivered: number;
  opened: number;
  replied: number;
}

export interface Message {
  id: string;
  campaignId: string;
  channel: MessageChannel;
  templateId: string;
  subject: string | null;
  body: string;
  status: MessageStatus;
  sendAt: string | null;
  abGroup: ABGroup;
  metrics: MessageMetrics;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  segmentId: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Event
// ============================================

export type EventType = '오프라인' | '온라인' | '하이브리드';
export type EventStatus = 'planning' | 'scheduled' | 'completed' | 'cancelled';

export interface Event {
  id: string;
  title: string;
  type: EventType;
  location: string;
  start: string;
  end: string;
  attendeeTarget: number;
  status: EventStatus;
}

// ============================================
// Donation
// ============================================

export type DonationMethod = 'card' | 'bank' | 'cash';

export interface Donation {
  id: string;
  donorId: string;
  amount: number;
  method: DonationMethod;
  createdAt: string;
}

export interface DonationStats {
  total: number;
  daily: {
    date: string;
    amount: number;
  }[];
}

// ============================================
// Task
// ============================================

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type ModuleName = 'Insights' | 'Studio' | 'Policy' | 'Ops' | 'Hub';

export interface Task {
  id: string;
  title: string;
  assignee: string;
  due: string;
  status: TaskStatus;
  module: ModuleName;
}

// ============================================
// Asset
// ============================================

export interface Asset {
  id: string;
  name: string;
  type: string; // MIME type
  url: string;
  tags: string[];
}

// ============================================
// Trend (여론 지수)
// ============================================

export interface TrendData {
  date: string;
  google: number; // 0-100
  naver: number; // 0-100
  snsMentions: number;
  snsPos: number;
  snsNeg: number;
}

export interface TrendWeights {
  gt: number; // Google Trends weight (default: 0.30)
  nv: number; // Naver weight (default: 0.30)
  sns: number; // SNS weight (default: 0.40)
}

export interface TrendIndex {
  date: string;
  index: number;
  gt_norm: number;
  nv_norm: number;
  sns_norm: number;
  sentiment: number;
}

export interface TrendSpike {
  date: string;
  source: 'google' | 'naver' | 'sns';
  keyword: string;
  rate: number;
}

export interface TrendAlerts {
  spikes: TrendSpike[];
  topKeywords: string[];
}

// ============================================
// Channel Links
// ============================================

export interface ChannelLink {
  key: string;
  url: string;
  label: string;
  visible: boolean;
}

export interface ChannelLinks {
  youtube: ChannelLink;
  kakao: ChannelLink;
  instagram: ChannelLink;
  naverBlog: ChannelLink;
  bannerDesigner: ChannelLink;
}

// ============================================
// Banner Designer
// ============================================

export interface BannerSize {
  w: number;
  h: number;
}

export interface BannerPreset {
  id: string;
  name: string;
  size: BannerSize;
  dpi: number;
  bleed: number;
  safeArea: number;
}

export interface BannerVariables {
  candidate: string;
  slogan: string;
  contact: string;
  qrUrl: string;
  theme: 'light' | 'dark';
}

export interface BannerRenderResult {
  fileUrl: string;
  previewUrl: string;
}

// ============================================
// Alert & Audit
// ============================================

export type AlertType = 'system' | 'workflow';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  read: boolean;
  pinned: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: ModuleName | 'System';
  target: string;
  details: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// RBAC
// ============================================

// v2.0: 3단계 역할 체계 (admin ⊃ editor ⊃ viewer)
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================
// KPI Types
// ============================================

export type KPIStatus = 'success' | 'warning' | 'danger';

export interface KPICardData {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  change?: number; // percentage change
  changeLabel?: string;
  status: KPIStatus;
  sparkline?: number[];
  source?: string;
}

// ============================================
// Module Card Types
// ============================================

export interface ModuleCardData {
  id: string;
  name: string;
  path: string;
  slogan: string;
  benefits: string[];
  thumbnail: string;
  kpis: {
    label: string;
    value: string | number;
  }[];
}
