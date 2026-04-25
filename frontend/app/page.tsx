"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, Scan, ClipboardList, UserPlus,
  TrendingUp, Clock, CheckCircle2, Activity,
  ArrowRight, ShieldCheck
} from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { getStats, getAttendance, getUsers, type AttendanceRecord, type User } from "@/lib/api";
import { format } from "date-fns";

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalUsers: 0, todayCount: 0, totalRecords: 0 });
  const [recentLogs, setRecentLogs] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [s, logs, u] = await Promise.all([
          getStats(),
          getAttendance(),
          getUsers(),
        ]);
        setStats(s);
        setRecentLogs(logs.slice(0, 6));
        setUsers(u);
      } catch (e: any) {
        setError("Cannot reach backend. Make sure the backend server is running on port 5000.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">FaceAttend Dashboard</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {format(new Date(), "EEEE, d MMMM yyyy")}
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="mb-6 p-4 rounded-xl flex items-start gap-3"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          <Activity size={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: "#f87171" }}>Backend Offline</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatsCard
          title="Total Users"
          value={loading ? "—" : stats.totalUsers}
          subtitle="Registered faces"
          icon={Users}
          accentColor="#6366f1"
          trend="Active profiles"
        />
        <StatsCard
          title="Today's Attendance"
          value={loading ? "—" : stats.todayCount}
          subtitle={`of ${stats.totalUsers} registered`}
          icon={CheckCircle2}
          accentColor="#22c55e"
          trend={
            stats.totalUsers > 0
              ? `${Math.round((stats.todayCount / Math.max(stats.totalUsers, 1)) * 100)}% attendance rate`
              : undefined
          }
        />
        <StatsCard
          title="Total Records"
          value={loading ? "—" : stats.totalRecords}
          subtitle="All-time logs"
          icon={ClipboardList}
          accentColor="#f59e0b"
          trend="Cumulative logs"
        />
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/register" id="btn-go-register" className="btn btn-primary w-full justify-center py-4 text-base">
          <UserPlus size={20} />
          Register User
          <ArrowRight size={16} className="ml-auto opacity-60" />
        </Link>
        <Link href="/attendance" id="btn-go-attendance" className="btn btn-success w-full justify-center py-4 text-base">
          <Scan size={20} />
          Start Attendance
          <ArrowRight size={16} className="ml-auto opacity-60" />
        </Link>
        <Link href="/logs" id="btn-go-logs" className="btn btn-ghost w-full justify-center py-4 text-base">
          <ClipboardList size={20} />
          View Logs
          <ArrowRight size={16} className="ml-auto opacity-60" />
        </Link>
      </div>

      {/* Bottom Grid: Recent Activity + Registered Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Clock size={16} style={{ color: "#6366f1" }} />
              Recent Activity
            </h2>
            <Link href="/logs" className="text-xs btn btn-ghost py-1 px-3">View all</Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
              ))}
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
              <Activity size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No attendance records yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}
                    >
                      {log.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{log.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{log.employeeId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{log.date}</p>
                    <p className="text-xs" style={{ color: "#818cf8" }}>{log.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registered Users */}
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Users size={16} style={{ color: "#22c55e" }} />
              Registered Users
            </h2>
            <Link href="/register" className="text-xs btn btn-ghost py-1 px-3">Add new</Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No users registered yet</p>
              <Link href="/register" className="btn btn-primary mt-3 text-sm py-2">Register first user</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {users.slice(0, 6).map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "white" }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{user.employeeId}</p>
                    </div>
                  </div>
                  <span className="badge badge-blue text-xs">{format(new Date(user.createdAt), "dd MMM")}</span>
                </div>
              ))}
              {users.length > 6 && (
                <p className="text-center text-xs pt-2" style={{ color: "var(--text-muted)" }}>
                  +{users.length - 6} more users
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
