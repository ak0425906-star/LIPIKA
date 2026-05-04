const API_BASE = "/api";

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
  username: string;
  roll_number: string;
  password: string;
  department: string;
  role: string;
  year?: string;
}

export interface UserLogin {
  username: string;
  password: string;
  role: string;
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
    let errorMessage = res.statusText;
    try {
      const err = await res.json();
      if (err && typeof err.detail === "string") {
        errorMessage = err.detail;
      } else if (err && err.message) {
        errorMessage = err.message;
      } else if (err && typeof err === "string") {
        errorMessage = err;
      } else if (err) {
        errorMessage = JSON.stringify(err);
      }
    } catch (e) {
      // Not JSON, use statusText
    }
    
    // Clean up traceback-like messages
    if (errorMessage.includes("Traceback (most recent call last)")) {
      errorMessage = "A server error occurred. Please try again.";
    }
    
    throw new Error(errorMessage);
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
  // Backend returns { access_token, token_type, user: { id, name, email, role, ... } }
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

export async function uploadReference(files: File[]): Promise<unknown> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append("files", file);
  });
  return apiFetch("/upload-reference", {
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
