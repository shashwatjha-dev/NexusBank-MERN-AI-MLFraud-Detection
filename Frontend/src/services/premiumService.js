import { apiClient, unwrap } from "./apiClient.js";

function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `premium-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export const premiumService = {
  async status() {
    return unwrap(
      await apiClient.get(
        "/accounts/premium/status"
      )
    );
  },

  async upgrade(sourceAccountId) {
    const response =
      await apiClient.post(
        "/accounts/premium/upgrade",
        {
          sourceAccountId,
          idempotencyKey:
            createIdempotencyKey(),
        }
      );

    return {
      data: unwrap(response),
      message:
        response.data?.message,
    };
  },
};