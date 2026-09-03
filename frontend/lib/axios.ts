import axios from "axios";
import { API_BASE } from "@/lib/api-base";

/* eslint-disable @next/next/no-location-assign-relative-destination -- this interceptor runs outside React and must force a clean auth navigation */

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

function isRefreshRequest(url?: string) {
  return url?.endsWith("/auth/refresh") ?? false;
}

function shouldRedirectToLogin() {
  if (typeof window === "undefined") return false;
  return !new Set(["/", "/demo"]).has(window.location.pathname);
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshRequest(originalRequest.url)
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        await new Promise<void>((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        });
        return api(originalRequest);
      }

      isRefreshing = true;
      try {
        await api.post("/auth/refresh");
        pendingQueue.forEach(({ resolve }) => resolve());
        pendingQueue = [];
        return api(originalRequest);
      } catch (refreshError) {
        pendingQueue.forEach(({ reject }) => reject(refreshError));
        pendingQueue = [];
        if (shouldRedirectToLogin()) {
          window.location.href = "/";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401 && !isRefreshRequest(originalRequest?.url)) {
      if (shouldRedirectToLogin()) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  },
);
