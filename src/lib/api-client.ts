import axios, { AxiosInstance, AxiosError } from "axios";
import { appConfig } from "./config";

const API_URL = appConfig.apiUrl;

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface APIUser {
  id?: string;
  username: string;
  email: string;
  role: "admin" | "tracker";
  is_active: boolean;
  created_at?: string;
}

interface CreateWorkerData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  id_number: string;
  password: string;
  default_timezone?: string;
  company_ids: string[];
  send_welcome_email?: boolean;
}

interface UpdateWorkerData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  id_number: string;
  password?: string;
  company_ids?: string[];
}

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  name: string; // Computed: first_name + last_name
  email: string;
  phone_number: string;
  id_number: string;
  created_at: string;
  company_ids: string[];
  company_names: string[];
}

interface TimeRecord {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_id_number: string;
  record_type: "entry" | "exit" | "pause_start" | "pause_end";
  timestamp: string;  // UTC ISO 8601
  duration_minutes?: number;
  company_id?: string;
  company_name?: string;
  pause_type_id?: string;
  pause_type_name?: string;
  pause_counts_as_work?: boolean;
}

interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  deleted_by?: string;
}

interface CreateCompanyData {
  name: string;
}

interface UpdateCompanyData {
  name?: string;
}

interface Incident {
  id: string;
  worker_id: string;
  worker_email: string;
  worker_name: string;
  worker_id_number: string;
  description: string;
  status: 'pending' | 'in_review' | 'resolved';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  admin_notes?: string;
}

interface UpdateIncidentData {
  status?: string;
  admin_notes?: string;
}

// Backup configuration types
interface BackupSchedule {
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  day_of_week?: number;
  day_of_month?: number;
}

interface S3ConfigInput {
  endpoint_url: string;
  bucket_name: string;
  access_key_id: string;
  secret_access_key: string;
  region?: string;
}

interface SFTPConfigInput {
  host: string;
  port?: number;
  username: string;
  password: string;
  remote_path?: string;
}

interface LocalConfig {
  path: string;
}

interface BackupConfigInput {
  enabled: boolean;
  schedule?: BackupSchedule;
  retention_days: number;
  storage_type: "s3" | "sftp" | "local";
  s3_config?: S3ConfigInput;
  sftp_config?: SFTPConfigInput;
  local_config?: LocalConfig;
}

interface BackupConfigResponse {
  enabled: boolean;
  schedule?: BackupSchedule;
  retention_days: number;
  storage_type: "s3" | "sftp" | "local";
  s3_configured: boolean;
  s3_endpoint?: string;
  s3_bucket?: string;
  sftp_configured: boolean;
  sftp_host?: string;
  sftp_path?: string;
  local_configured: boolean;
  local_path?: string;
}

interface Backup {
  id: string;
  filename: string;
  storage_path: string;
  storage_type: "s3" | "sftp" | "local";
  size_bytes: number;
  size_human: string;
  created_at: string;
  completed_at?: string;
  duration_seconds?: number;
  status: "in_progress" | "completed" | "failed";
  trigger: "scheduled" | "manual" | "pre_restore";
  error_message?: string;
  collections_count?: number;
  documents_count?: number;
  checksum_sha256?: string;
}

interface BackupListResponse {
  backups: Backup[];
  total_count: number;
  total_size_bytes: number;
  total_size_human: string;
}

interface RestoreResponse {
  status: "success" | "failed";
  message: string;
  pre_restore_backup_id?: string;
}

interface TestConnectionRequest {
  storage_type: "s3" | "sftp" | "local";
  s3_endpoint_url?: string;
  s3_bucket_name?: string;
  s3_access_key_id?: string;
  s3_secret_access_key?: string;
  s3_region?: string;
  sftp_host?: string;
  sftp_port?: number;
  sftp_username?: string;
  sftp_password?: string;
  sftp_remote_path?: string;
  local_path?: string;
}

interface TestConnectionResponse {
  success: boolean;
  message: string;
}

interface Settings {
  id: string;
  contact_email: string;
  backup_config?: BackupConfigResponse;
}

interface UpdateSettingsData {
  contact_email?: string;
  backup_config?: BackupConfigInput;
}

interface PauseType {
  id: string;
  name: string;
  type: "inside_shift" | "outside_shift";
  company_ids: string[];
  company_names: string[];
  description?: string;
  can_edit_type: boolean;
  usage_count: number;
  created_at: string;
  updated_at?: string;
}

interface CreatePauseTypeData {
  name: string;
  type: "inside_shift" | "outside_shift";
  company_ids: string[];
  description?: string;
}

interface UpdatePauseTypeData {
  name?: string;
  type?: "inside_shift" | "outside_shift";
  company_ids?: string[];
  description?: string;
}

interface ChangeRequest {
  id: string;
  worker_id: string;
  worker_email: string;
  worker_name: string;
  worker_id_number: string;
  date: string;
  time_record_id: string;
  original_timestamp: string;  // UTC ISO 8601
  original_created_at: string;
  original_type: "entry" | "exit";
  company_id: string;
  company_name: string;
  new_timestamp: string;  // UTC ISO 8601
  reason: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
  reviewed_by_admin_id?: string;
  reviewed_by_admin_email?: string;
  reviewed_at?: string;
  admin_internal_notes?: string;
  admin_public_comment?: string;
  validation_errors?: string[];
}

interface UpdateChangeRequestData {
  status: "accepted" | "rejected";
  admin_internal_notes?: string;
  admin_public_comment?: string;
}

interface GDPRExportData {
  export_date: string;
  worker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    id_number: string;
    created_at: string;
    companies: string[];
  };
  time_records: TimeRecord[];
  incidents: Incident[];
  change_requests: ChangeRequest[];
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // If 401 and not on login endpoint, redirect to login
        if (error.response?.status === 401 && !error.config?.url?.includes("/api/token")) {
          this.clearToken();
          if (typeof window !== "undefined") {
            window.location.href = `${appConfig.basePath}/login`;
          }
        }
        return Promise.reject(error);
      }
    );

    // Load token from localStorage on init
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("token");
      if (savedToken) {
        this.token = savedToken;
      }
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  }

  getToken() {
    return this.token;
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<LoginResponse> {
    const formData = new FormData();
    // Note: OAuth2 standard uses "username" field, but we send email as the value
    formData.append("username", email);
    formData.append("password", password);

    const response = await this.client.post<LoginResponse>("/api/token", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    this.setToken(response.data.access_token);
    return response.data;
  }

  async getCurrentUser(): Promise<APIUser> {
    const response = await this.client.get<APIUser>("/api/users/me");
    return response.data;
  }

  logout() {
    this.clearToken();
    if (typeof window !== "undefined") {
      window.location.href = `${appConfig.basePath}/login`;
    }
  }

  // Password recovery endpoints
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>("/api/forgot-password", { email });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>("/api/reset-password", {
      token,
      new_password: newPassword,
    });
    return response.data;
  }

  // Workers endpoints
  async getWorkers() {
    const response = await this.client.get("/api/workers/");
    return response.data;
  }

  async getWorker(id: string) {
    const response = await this.client.get(`/api/workers/${id}`);
    return response.data;
  }

  async createWorker(data: CreateWorkerData) {
    const response = await this.client.post("/api/workers/", data);
    return response.data;
  }

  async updateWorker(id: string, data: UpdateWorkerData) {
    const response = await this.client.put(`/api/workers/${id}`, data);
    return response.data;
  }

  async deleteWorker(id: string) {
    await this.client.delete(`/api/workers/${id}`);
  }

  // Time records endpoints
  async getTimeRecords(params?: { start_date?: string; end_date?: string; company_id?: string; worker_name?: string }): Promise<TimeRecord[]> {
    const response = await this.client.get("/api/time-records/", { params });
    return response.data;
  }

  async getWorkerTimeRecords(workerId: string, params?: { start_date?: string; end_date?: string }): Promise<TimeRecord[]> {
    const response = await this.client.get(`/api/time-records/worker/${workerId}`, { params });
    return response.data;
  }

  // Incidents endpoints
  async getIncidents(params?: {
    status?: string;
    worker_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Incident[]> {
    const response = await this.client.get("/api/incidents/", { params });
    return response.data;
  }

  async getIncident(id: string): Promise<Incident> {
    const response = await this.client.get(`/api/incidents/${id}`);
    return response.data;
  }

  async updateIncident(id: string, data: UpdateIncidentData): Promise<Incident> {
    const response = await this.client.patch(`/api/incidents/${id}`, data);
    return response.data;
  }

  // Settings endpoints
  async getSettings(): Promise<Settings> {
    const response = await this.client.get<Settings>("/api/settings/");
    return response.data;
  }

  async updateSettings(data: UpdateSettingsData): Promise<Settings> {
    const response = await this.client.patch<Settings>("/api/settings/", data);
    return response.data;
  }

  // Companies endpoints
  async getCompanies(): Promise<Company[]> {
    const response = await this.client.get<Company[]>("/api/companies/");
    return response.data;
  }

  async getCompany(id: string): Promise<Company> {
    const response = await this.client.get<Company>(`/api/companies/${id}`);
    return response.data;
  }

  async createCompany(data: CreateCompanyData): Promise<Company> {
    const response = await this.client.post<Company>("/api/companies/", data);
    return response.data;
  }

  async updateCompany(id: string, data: UpdateCompanyData): Promise<Company> {
    const response = await this.client.patch<Company>(`/api/companies/${id}`, data);
    return response.data;
  }

  async deleteCompany(id: string): Promise<void> {
    await this.client.delete(`/api/companies/${id}`);
  }

  // Pause Types endpoints
  async getPauseTypes(): Promise<PauseType[]> {
    const response = await this.client.get<PauseType[]>("/api/pause-types/");
    return response.data;
  }

  async getPauseType(id: string): Promise<PauseType> {
    const response = await this.client.get<PauseType>(`/api/pause-types/${id}`);
    return response.data;
  }

  async createPauseType(data: CreatePauseTypeData): Promise<PauseType> {
    const response = await this.client.post<PauseType>("/api/pause-types/", data);
    return response.data;
  }

  async updatePauseType(id: string, data: UpdatePauseTypeData): Promise<PauseType> {
    const response = await this.client.patch<PauseType>(`/api/pause-types/${id}`, data);
    return response.data;
  }

  async deletePauseType(id: string): Promise<void> {
    await this.client.delete(`/api/pause-types/${id}`);
  }

  // Change Requests endpoints
  async getChangeRequests(params?: {
    status?: "pending" | "accepted" | "rejected";
    worker_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ChangeRequest[]> {
    const response = await this.client.get<ChangeRequest[]>("/api/change-requests/", { params });
    return response.data;
  }

  async getChangeRequest(id: string): Promise<ChangeRequest> {
    const response = await this.client.get<ChangeRequest>(`/api/change-requests/${id}`);
    return response.data;
  }

  async updateChangeRequest(id: string, data: UpdateChangeRequestData): Promise<ChangeRequest> {
    const response = await this.client.patch<ChangeRequest>(`/api/change-requests/${id}`, data);
    return response.data;
  }

  // GDPR endpoints
  async exportWorkerGDPRData(workerId: string): Promise<GDPRExportData> {
    const response = await this.client.get<GDPRExportData>(`/api/gdpr/worker/${workerId}/export`);
    return response.data;
  }

  async deleteWorkerGDPRData(workerId: string, reason: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>(`/api/gdpr/worker/${workerId}/anonymize`, {
      reason
    });
    return response.data;
  }

  // Backup endpoints
  async getBackups(): Promise<BackupListResponse> {
    const response = await this.client.get<BackupListResponse>("/api/backups/");
    return response.data;
  }

  async getBackup(id: string): Promise<Backup> {
    const response = await this.client.get<Backup>(`/api/backups/${id}`);
    return response.data;
  }

  async triggerBackup(): Promise<Backup> {
    const response = await this.client.post<Backup>("/api/backups/trigger");
    return response.data;
  }

  async deleteBackup(id: string): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>(`/api/backups/${id}`);
    return response.data;
  }

  async restoreBackup(id: string): Promise<RestoreResponse> {
    const response = await this.client.post<RestoreResponse>(`/api/backups/${id}/restore`, { confirm: true });
    return response.data;
  }

  async getBackupDownloadUrl(id: string): Promise<{ download_url: string; expires_in: number | null; storage_type: string }> {
    const response = await this.client.get(`/api/backups/${id}/download-url`);
    return response.data;
  }

  async downloadBackup(id: string, filename: string): Promise<void> {
    const response = await this.client.get(`/api/backups/${id}/download`, {
      responseType: 'blob'
    });

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: 'application/gzip' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async testBackupConnection(data: TestConnectionRequest): Promise<TestConnectionResponse> {
    const response = await this.client.post<TestConnectionResponse>("/api/backups/test-connection", data);
    return response.data;
  }

  async getBackupScheduleStatus(): Promise<{ scheduled: boolean; next_run: string | null }> {
    const response = await this.client.get("/api/backups/schedule/status");
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export type {
  APIUser,
  LoginResponse,
  CreateWorkerData,
  UpdateWorkerData,
  Worker,
  TimeRecord,
  Company,
  CreateCompanyData,
  UpdateCompanyData,
  Incident,
  UpdateIncidentData,
  Settings,
  UpdateSettingsData,
  PauseType,
  CreatePauseTypeData,
  UpdatePauseTypeData,
  ChangeRequest,
  UpdateChangeRequestData,
  BackupSchedule,
  S3ConfigInput,
  SFTPConfigInput,
  LocalConfig,
  BackupConfigInput,
  BackupConfigResponse,
  Backup,
  BackupListResponse,
  RestoreResponse,
  TestConnectionRequest,
  TestConnectionResponse
};
