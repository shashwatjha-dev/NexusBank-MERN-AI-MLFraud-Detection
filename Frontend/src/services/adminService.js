import { apiClient, unwrap } from "./apiClient.js";

export const adminService = {
  async overview() { return unwrap(await apiClient.get("/admin/overview")); },
  async users(params = {}) { return unwrap(await apiClient.get("/admin/users", { params })); },
  async user(id) { return unwrap(await apiClient.get(`/admin/users/${id}`)); },
  async block(id) { return unwrap(await apiClient.put(`/admin/users/${id}/block`)); },
  async unblock(id) { return unwrap(await apiClient.put(`/admin/users/${id}/unblock`)); },
  async transactions(params = {}) { return unwrap(await apiClient.get("/admin/transactions", { params })); },
  async fraud(params = {}) { return unwrap(await apiClient.get("/admin/fraud", { params })); },
  async fraudLog(id) { return unwrap(await apiClient.get(`/admin/fraud/${id}`)); },
  async reviewFraud(id, payload) { return unwrap(await apiClient.put(`/admin/fraud/${id}/review`, payload)); },
  async audit(params = {}) { return unwrap(await apiClient.get("/admin/audit-logs", { params })); },
};