import axios from "axios";
import { v4 as uuid } from "uuid";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? "https://nexusbank-backend-930z.onrender.com/api"
    : "http://localhost:5000/api");

export const TOKEN_STORAGE_KEY = "nexusbank.token";

let onUnauthorized = null;
export const registerUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["x-request-id"] = config.headers["x-request-id"] || uuid();
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && typeof onUnauthorized === "function") {
      onUnauthorized();
    }
    return Promise.reject(normalizeError(error));
  }
);

function normalizeError(error) {
  const data = error?.response?.data;
  if (data?.error) {
    return {
      status: error.response.status,
      code: data.error.code || "UNKNOWN_ERROR",
      message: data.error.message || "Something went wrong.",
      requestId: data.requestId || null,
      raw: error,
    };
  }
  if (error?.code === "ECONNABORTED") {
    return {
      status: 0,
      code: "TIMEOUT",
      message: "Network timed out.",
      raw: error,
    };
  }
  if (!error?.response) {
    return {
      status: 0,
      code: "NETWORK_ERROR",
      message: "Cannot reach server.",
      raw: error,
    };
  }
  return {
    status: error.response.status,
    code: "UNKNOWN_ERROR",
    message: error.message || "Unexpected error.",
    raw: error,
  };
}

/** Extract `data.data` from the uniform backend envelope. */
export const unwrap = (response) => response?.data?.data;