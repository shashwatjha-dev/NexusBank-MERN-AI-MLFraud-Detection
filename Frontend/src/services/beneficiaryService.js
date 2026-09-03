import { apiClient, unwrap } from "./apiClient.js";

export const beneficiaryService = {
  async list() {
    const res = await apiClient.get("/beneficiaries");
    return unwrap(res);
  },
  async create(payload) {
    const res = await apiClient.post("/beneficiaries", payload);
    return unwrap(res);
  },
  async update(id, patch) {
    const res = await apiClient.put(`/beneficiaries/${id}`, patch);
    return unwrap(res);
  },
  async remove(id) {
    const res = await apiClient.delete(`/beneficiaries/${id}`);
    return unwrap(res);
  },
};