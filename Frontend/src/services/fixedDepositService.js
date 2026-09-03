import { apiClient, unwrap } from "./apiClient.js";
export const fixedDepositService = {
  async list() { return unwrap(await apiClient.get("/fd")); },
  async get(id) { return unwrap(await apiClient.get(`/fd/${id}`)); },
  async create(payload) { return unwrap(await apiClient.post("/fd", payload)); },
};