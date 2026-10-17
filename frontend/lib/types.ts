export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  roles: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  user_id: string;
  user_email: string;
  project_role: string;
}

export interface ProductComparison {
  id: string;
  product_id: string;
  source_id: string;
  source_name: string;
  source_product_title: string;
  source_product_url: string | null;
  price: number | null;
  price_diff: number | null;
  price_diff_percent: number | null;
  availability: string;
  rating: number | null;
  reviews_count: number | null;
  seller: string;
  match_status: string;
  specifications: Record<string, unknown> | string | null;
  last_checked_at: string;
}

export interface Product {
  id: string;
  project_id: string;
  sku: string;
  gtin: string | null;
  title: string;
  brand: string;
  category: string;
  status: string;
  target_price: number | null;
  current_price: number | null;
  url: string | null;
  image_url: string | null;
  specifications: Record<string, unknown> | string | null;
  comparisons?: ProductComparison[];
  created_at: string;
  updated_at: string;
}

export interface SourceItem {
  id: string;
  name: string;
  source_type: string;
  base_url: string;
  is_active: boolean;
  sync_frequency: string;
  created_at: string;
}

export interface CredentialItem {
  id: string;
  name: string;
  provider: string;
  key_hint: string;
  is_active: boolean;
  created_at: string;
}

export interface JobItem {
  id: string;
  job_name: string;
  status: string;
  details: string;
  error_message: string | null;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  details: string;
  created_at: string;
}

export interface DashboardSummary {
  total_projects: number;
  total_products: number;
  verified_products: number;
  failed_products: number;
  active_jobs: number;
  queued_jobs: number;
  monitoring_tasks: number;
  healthy_workers: number;
  failed_executions: number;
  average_market_price: number | null;
}
