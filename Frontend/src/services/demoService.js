import {
  apiClient,
  unwrap,
  TOKEN_STORAGE_KEY,
} from "./apiClient.js";

import { authService } from "./authService.js";


export const demoService = {

  async run(scenario) {

    const normalizedScenario =
      String(scenario || "")
        .trim()
        .toLowerCase();


    if (
      !["low", "medium", "high"].includes(
        normalizedScenario
      )
    ) {
      throw {
        status: 400,
        code: "UNKNOWN_SCENARIO",
        message:
          "Invalid fraud demo scenario.",
      };
    }


    const token =
      window.localStorage.getItem(
        TOKEN_STORAGE_KEY
      );


    if (!token) {
      throw {
        status: 401,
        code:
          "AUTHENTICATION_REQUIRED",
        message:
          "Your login session is missing. Please sign in again.",
      };
    }


    const deviceIdentifier =
      authService.deviceIdentifier();


    console.log(
      `[NexusBank Demo] POST /demo/fraud/${normalizedScenario}`
    );


    const response =
      await apiClient.post(
        `/demo/fraud/${normalizedScenario}`,

        {
          deviceIdentifier,
        },

        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );


    console.log(
      "[NexusBank Demo] Response:",
      response.data
    );


    return unwrap(response);
  },
};