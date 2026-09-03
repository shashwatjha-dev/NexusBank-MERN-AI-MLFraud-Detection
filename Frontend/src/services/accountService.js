import { apiClient, unwrap } from "./apiClient.js";

export const accountService = {
  async list() {
    const res = await apiClient.get("/accounts");
    return unwrap(res);
  },
  async get(id) {
    const res = await apiClient.get(`/accounts/${id}`);
    return unwrap(res);
  },
  async overview(params = {}) {
    const res = await apiClient.get("/accounts/overview", { params });
    return unwrap(res);
  },
  async create(payload) {
    const res = await apiClient.post("/accounts", payload);
    return { data: unwrap(res), message: res.data?.message };
  },
  async setPrimary(id) {
    const res = await apiClient.put(`/accounts/${id}/primary`);
    return { data: unwrap(res), message: res.data?.message };
  },
};