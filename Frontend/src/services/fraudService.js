import { apiClient, unwrap } from "./apiClient.js";
export const fraudService = {
  async overview() { return unwrap(await apiClient.get("/fraud/overview")); },
  async logs() { return unwrap(await apiClient.get("/fraud/logs")); },
  async log(id) { return unwrap(await apiClient.get(`/fraud/logs/${id}`)); },
};