import ky, { isHTTPError } from "ky";
import { showErrorToast } from "./errors";

export const api = ky.create({
  prefix: "/api",
  hooks: {
    beforeError: [
      async ({ error }) => {
        if (isHTTPError(error)) {
          if (error.response.status === 401) {
            if (window.location.pathname !== "/login") {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }
            return error;
          }
          await showErrorToast(error);
        }
        return error;
      },
    ],
  },
});

export const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
