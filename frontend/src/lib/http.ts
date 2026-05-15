import ky, { isHTTPError } from "ky";

export const api = ky.create({
  prefix: "/api",
  hooks: {
    beforeError: [
      ({ error }) => {
        if (isHTTPError(error) && error.response.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
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
