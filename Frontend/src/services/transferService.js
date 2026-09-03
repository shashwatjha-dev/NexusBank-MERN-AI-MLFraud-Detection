import { apiClient, unwrap } from "./apiClient.js";
import { authService } from "./authService.js";

export const transferService = {
  async create(payload) {
    const res = await apiClient.post("/transfers", {
      ...payload,
      deviceIdentifier: authService.deviceIdentifier(),
    });
    return { data: unwrap(res), message: res.data?.message };
  },
  async verify(id, otp) {
    const res = await apiClient.post(`/transfers/${id}/verify`, {
      otp,
      deviceIdentifier: authService.deviceIdentifier(),
    });
    return { data: unwrap(res), message: res.data?.message };
  },
  async resendVerifyOtp(id) {
    const res = await apiClient.post(`/transfers/${id}/resend-otp`, {});
    return { data: unwrap(res), message: res.data?.message };
  },
  async list(params = {}) {
    const res = await apiClient.get("/transactions", { params });
    return unwrap(res);
  },
  async get(id) {
    const res = await apiClient.get(`/transactions/${id}`);
    return unwrap(res);
  },
};