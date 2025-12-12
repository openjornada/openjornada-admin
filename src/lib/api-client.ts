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

interface Settings {
  id: string;
  contact_email: string;
}

interface UpdateSettingsData {
  contact_email?: string;
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
            window.location.href = "/login";
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
      window.location.href = "/login";
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
  UpdateChangeRequestData
};
