const API_BASE = "https://thxanozz.onrender.com";

// Token management
let authToken: string | null = localStorage.getItem("lipika_token");
let currentUser: UserOut | null = JSON.parse(localStorage.getItem("lipika_user") || "null");

export interface UserOut {
  id: number;
  name: string;
  email: string;
  role: string;
  roll_number: string | null;
  department: string | null;
  year: string | null;
}

export interface UserCreate {
  name: string;
  email: string;
  password: string;
  role: string;
  roll_number?: string;
  department?: string;
  year?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

function setAuth(token: string, user: UserOut) {
  authToken = token;
  currentUser = user;
  localStorage.setItem("lipika_token", token);
  localStorage.setItem("lipika_user", JSON.stringify(user));
}

export function clearAuth() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("lipika_token");
  localStorage.removeItem("lipika_user");
}

export function getToken(): string | null {
  return authToken;
}

export function getCurrentUser(): UserOut | null {
  return currentUser;
}

export function isAuthenticated(): boolean {
  return !!authToken && !!currentUser;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  // Only set Content-Type for non-FormData bodies
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail));
  }
  return res.json();
}

// Auth
export async function signup(data: UserCreate): Promise<UserOut> {
  return apiFetch("/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function login(data: UserLogin): Promise<{ token: string; user: UserOut }> {
  const res = await apiFetch("/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  // Adapt to whatever the API returns - typically { access_token, user } or { token, ... }
  const token = res.access_token || res.token;
  const user: UserOut = res.user || res;
  if (token) {
    setAuth(token, user);
  }
  return { token, user };
}

export async function logout() {
  clearAuth();
}

// Assignments
export async function uploadAssignment(file: File): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch("/upload-assignment", {
    method: "POST",
    body: formData,
  });
}

export async function getTeacherAssignments(): Promise<unknown> {
  return apiFetch("/teacher/assignments");
}

// Admin
export async function getAdminStudents(): Promise<UserOut[]> {
  return apiFetch("/admin/students");
}

export async function adminUploadTrainingByRoll(rollNumber: string, file: File): Promise<unknown> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch(`/admin/upload-training-by-roll/${rollNumber}`, {
    method: "POST",
    body: formData,
  });
}
