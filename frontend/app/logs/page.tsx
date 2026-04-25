"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  ClipboardList, Download, Trash2, Search,
  Calendar, RefreshCw, CheckCircle2, UserCheck,
  ChevronDown, ChevronUp, Loader2, Users
} from "lucide-react";
import {
  getAttendance, getUsers, markManualAttendance, getExportUrl,
  type AttendanceRecord, type User
} from "@/lib/api";
import { format } from "date-fns";

export default function LogsPage() {
  const [records,      setRecords]      = useState<AttendanceRecord[]>([]);
  const [users,        setUsers]        = useState<User[]>([]);
  const [filterDate,   setFilterDate]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchTerm,   setSearchTerm]   = useState("");
  const [loading,      setLoading]      = useState(true);
  const [sortField,    setSortField]    = useState<"name" | "time" | "date">("time");
  const [sortDir,      setSortDir]      = useState<"asc" | "desc">("desc");
  const [manualUserId, setManualUserId] = useState("");
  const [marking,      setMarking]      = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, u] = await Promise.all([
        getAttendance(filterDate || undefined),
        getUsers(),
      ]);
      setRecords(recs);
      setUsers(u);
    } catch (e: any) {
      toast.error("Failed to load data. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived: filtered + sorted ────────────────────────────────────
  const displayed = records
    .filter((r) => {
      if (!searchTerm) return true;
      const t = searchTerm.toLowerCase();
      return r.name.toLowerCase().includes(t) || r.employeeId.toLowerCase().includes(t);
    })
    .sort((a, b) => {
      const aVal = sortField === "name" ? a.name : sortField === "time" ? a.time : a.date;
      const bVal = sortField === "name" ? b.name : sortField === "time" ? b.time : b.date;
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

  function toggleSort(field: "name" | "time" | "date") {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  function SortIcon({ field }: { field: "name" | "time" | "date" }) {
    if (sortField !== field) return <ChevronDown size={12} className="opacity-30" />;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  async function handleManualMark() {
    if (!manualUserId) return toast.error("Select a user first");
    setMarking(true);
    try {
      const res = await markManualAttendance(manualUserId, filterDate || undefined);
      toast.success(res.message);
      setManualUserId("");
      await loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to mark attendance");
    } finally {
      setMarking(false);
    }
  }

  async function handleExport() {
    const url = await getExportUrl(filterDate || undefined);
    window.open(url, "_blank");
  }

  const presentToday = records.filter((r) => r.status === "present").length;
  const manualToday  = records.filter((r) => r.status === "manual").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-3">
            <ClipboardList size={26} />
            Attendance Logs
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            View, filter, and export attendance records.
          </p>
        </div>
        <div className="flex gap-2">
          <button id="btn-refresh-logs" onClick={loadData} className="btn btn-ghost py-2 px-4">
            <RefreshCw size={15} /> Refresh
          </button>
          <button id="btn-export-csv" onClick={handleExport} className="btn btn-primary py-2 px-4">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Total Records</p>
          <p className="text-2xl font-bold">{records.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Auto-recognised</p>
          <p className="text-2xl font-bold" style={{ color: "#22c55e" }}>{presentToday}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Manual Entries</p>
          <p className="text-2xl font-bold" style={{ color: "#f59e0b" }}>{manualToday}</p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="glass p-4 mb-6 flex flex-col sm:flex-row gap-3">
        {/* Date Filter */}
        <div className="flex items-center gap-2 flex-1">
          <Calendar size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            id="filter-date"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input py-2"
          />
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1">
          <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            id="search-logs"
            type="text"
            placeholder="Search by name or ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input py-2"
          />
        </div>

        {/* Clear filter */}
        {filterDate && (
          <button onClick={() => setFilterDate("")} className="btn btn-ghost py-2 px-3 text-sm">
            All dates
          </button>
        )}
      </div>

      {/* Manual Mark Attendance */}
      <div className="glass p-4 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <UserCheck size={14} /> Manual Attendance Override
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            id="select-manual-user"
            value={manualUserId}
            onChange={(e) => setManualUserId(e.target.value)}
            className="input py-2 flex-1"
            style={{ cursor: "pointer" }}
          >
            <option value="">Select user…</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.employeeId})
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input py-2 sm:w-48"
          />
          <button
            id="btn-mark-manual"
            onClick={handleManualMark}
            disabled={marking || !manualUserId}
            className="btn btn-primary py-2 px-5"
          >
            {marking ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Mark Present
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin" style={{ color: "#6366f1" }} />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ color: "var(--text-muted)" }}>
            <ClipboardList size={48} className="opacity-30 mb-3" />
            <p className="text-sm">No records found</p>
            {filterDate && <p className="text-xs mt-1">Try changing the date filter</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>
                    <button className="flex items-center gap-1" onClick={() => toggleSort("name")}>
                      Name <SortIcon field="name" />
                    </button>
                  </th>
                  <th>Employee ID</th>
                  <th>
                    <button className="flex items-center gap-1" onClick={() => toggleSort("date")}>
                      Date <SortIcon field="date" />
                    </button>
                  </th>
                  <th>
                    <button className="flex items-center gap-1" onClick={() => toggleSort("time")}>
                      Time <SortIcon field="time" />
                    </button>
                  </th>
                  <th>Status</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((r, i) => (
                  <tr key={r._id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{i + 1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}
                        >
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{r.employeeId}</td>
                    <td>{r.date}</td>
                    <td>
                      <span className="font-mono text-sm" style={{ color: "#818cf8" }}>{r.time}</span>
                    </td>
                    <td>
                      <span className={`badge ${r.status === "present" ? "badge-green" : "badge-amber"}`}>
                        {r.status === "present" ? <CheckCircle2 size={10} /> : <UserCheck size={10} />}
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.confidence !== undefined && r.confidence !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.round(r.confidence * 100)}%`,
                                background: "linear-gradient(90deg, #6366f1, #22c55e)",
                              }}
                            />
                          </div>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {Math.round(r.confidence * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {displayed.length > 0 && (
          <div className="px-4 py-3 border-t flex justify-between items-center text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            <span>Showing {displayed.length} of {records.length} records</span>
            <span>Sorted by {sortField} ({sortDir})</span>
          </div>
        )}
      </div>
    </div>
  );
}
