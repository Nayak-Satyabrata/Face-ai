/**
 * API Client
 * Centralised axios instance pointing to the Express backend.
 */

import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ─── Types ────────────────────────────────────────────────────────

export interface User {
  _id: string;
  name: string;
  employeeId: string;
  createdAt: string;
}

export interface AttendanceRecord {
  _id: string;
  userId: string;
  name: string;
  employeeId: string;
  date: string;
  time: string;
  status: "present" | "manual";
  confidence?: number;
  createdAt: string;
}

export interface Stats {
  totalUsers: number;
  todayCount: number;
  totalRecords: number;
}

// ─── User APIs ────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get("/users");
  return data.data;
}

export async function registerUser(payload: {
  name: string;
  employeeId: string;
  faceDescriptors: number[][];
}): Promise<{ message: string; data: User }> {
  const { data } = await api.post("/users/register", payload);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

// ─── Attendance APIs ──────────────────────────────────────────────

export async function recognize(descriptor: number[]): Promise<{
  success: boolean;
  recognized: boolean;
  alreadyMarked?: boolean;
  message: string;
  user?: { id: string; name: string; employeeId: string };
  confidence?: number;
}> {
  const { data } = await api.post("/attendance/recognize", { descriptor });
  return data;
}

export async function getAttendance(date?: string): Promise<AttendanceRecord[]> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const { data } = await api.get("/attendance", { params });
  return data.data;
}

export async function getStats(): Promise<Stats> {
  const { data } = await api.get("/attendance/stats");
  return data.data;
}

export async function markManualAttendance(userId: string, date?: string) {
  const { data } = await api.post("/attendance/manual", { userId, date });
  return data;
}

export function getExportUrl(date?: string): string {
  const params = date ? `?date=${date}` : "";
  return `${API_BASE}/attendance/export${params}`;
}

export default api;
