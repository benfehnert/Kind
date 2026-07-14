import { Platform } from "react-native";

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

let getToken = () => null;
let onRefresh = null;
let onUnauthorized = null;
let refreshInFlight = null;

export function configureApiAuth({ getToken: getTokenFn, onRefresh: refreshFn, onUnauthorized: unauthorizedFn }) {
  getToken = getTokenFn ?? (() => null);
  onRefresh = refreshFn ?? null;
  onUnauthorized = unauthorizedFn ?? null;
}

// Concurrent 401s (e.g. from a fan-out of parallel requests) must share a
// single refresh attempt — Supabase refresh tokens are single-use, so firing
// one per request races them against each other and the losers wipe out the
// session the winner just re-established.
function refreshOnce() {
  if (!onRefresh) return Promise.resolve(false);
  if (!refreshInFlight) {
    refreshInFlight = Promise.resolve(onRefresh()).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseResponse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(method, path, body, { isPublic = false, retried = false, headers: extraHeaders } = {}) {
  const headers = { ...extraHeaders };
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (!isPublic) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
  });

  if (res.status === 401 && !isPublic && !retried && onRefresh) {
    const refreshed = await refreshOnce();
    if (refreshed) return request(method, path, body, { isPublic, retried: true });
    onUnauthorized?.();
  }

  const data = await parseResponse(res);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `${method} ${path} → ${res.status}`);
  }

  return data;
}

export function publicPost(path, body) {
  return request("POST", path, body, { isPublic: true });
}

export function get(path) {
  return request("GET", path);
}

export function post(path, body) {
  return request("POST", path, body);
}

export function patch(path, body) {
  return request("PATCH", path, body);
}

export async function uploadProfileAvatar(uri) {
  const formData = new FormData();

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append("file", blob, "avatar.jpg");
  } else {
    formData.append("file", {
      uri,
      name: "avatar.jpg",
      type: "image/jpeg"
    });
  }

  return request("POST", "/profile/avatar", formData);
}

export function put(path, body) {
  return request("PUT", path, body);
}
