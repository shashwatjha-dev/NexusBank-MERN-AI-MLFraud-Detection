import { apiClient } from "./apiClient";

/**
 * Notifications API client (Batch 6).
 * All calls are authenticated via the shared apiClient (which adds the Bearer
 * token from AuthContext). Endpoints match Backend/routes/notificationRoutes.js.
 */
export const notificationsApi = {
  list: (params = {}) => apiClient.get("/notifications", { params }),
  unreadCount: () => apiClient.get("/notifications/unread-count"),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch("/notifications/read-all"),
};

/**
 * Statement export helpers (Batch 6). Return raw blob URLs so the browser
 * can trigger downloads without exposing the auth token in the URL.
 */
export const statementExports = {
  csvUrl: (accountId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `/statements/${accountId}/export.csv${qs ? `?${qs}` : ""}`;
  },
  pdfUrl: (accountId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return `/statements/${accountId}/export.pdf${qs ? `?${qs}` : ""}`;
  },
};

/**
 * Downloads an authenticated file (statement/receipt) as a blob and forces
 * a save dialog. This is needed because <a href> won't send Authorization
 * headers.
 */
export async function downloadAuthenticatedFile(path, filename) {
  const response = await apiClient.get(path, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const receiptsApi = {
  transactionPdf: (transactionId) =>
    downloadAuthenticatedFile(
      `/receipts/transactions/${transactionId}.pdf`,
      `nexusbank-receipt-${transactionId}.pdf`
    ),
};