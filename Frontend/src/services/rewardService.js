import {
  apiClient,
  unwrap,
} from "./apiClient.js";

export const rewardService = {
  async list() {
    return unwrap(
      await apiClient.get(
        "/rewards"
      )
    );
  },

  async redeem(points) {
    return unwrap(
      await apiClient.post(
        "/rewards/redeem",
        {
          points,
        }
      )
    );
  },
};