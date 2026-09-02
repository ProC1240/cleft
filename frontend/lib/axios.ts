import axios from "axios";
import { API_BASE } from "@/lib/api-base";

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
        if (typeof window !== "undefined" && window.location.pathname !== "/") {
          window.location.href = "/";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401 && !isRefreshRequest(originalRequest?.url)) {
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  },
);
