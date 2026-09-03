import { apiClient, unwrap } from "./apiClient.js";

export const alertService = {
  async list() {
    return unwrap(
      await apiClient.get("/alerts")
    );
  },

  async markRead(id) {
    return unwrap(
      await apiClient.put(
        `/alerts/${id}/read`
      )
    );
  },
};