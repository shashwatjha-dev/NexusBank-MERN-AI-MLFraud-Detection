import { apiClient, unwrap } from "./apiClient.js";

export const ppfService = {
  async summary() {
    return unwrap(await apiClient.get("/ppf"));
  },

  async contributions() {
    return unwrap(await apiClient.get("/ppf/contributions"));
  },

  async open() {
    const res = await apiClient.post("/ppf/open");
    return {
      data: unwrap(res),
      message: res.data?.message,
    };
  },

  async contribute(payload) {
    const res = await apiClient.post("/ppf/contributions", payload);
    return {
      data: unwrap(res),
      message: res.data?.message,
    };
  },
};