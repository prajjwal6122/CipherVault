/**
 * Healthcare Analytics Dashboard
 * Clean, minimalistic design inspired by HealthWorks AI
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, subDays } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import apiClient from "../api/client";
import { useAuth } from "../hooks/useAuth";

// Material UI Icons
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";

// Chart colors (purple monochromatic)
const CHART_COLORS = ["#6b21a8", "#7c3aed", "#a855f7", "#c084fc"];

// ==================== MOCK DATA ====================
const generateEncryptedMockData = () => ({
  patients: [
    {
      id: "P001",
      name: "●●●●●●●●",
      age: "██",
      gender: "●",
      diagnosis: "████████████",
      status: "Active",
      riskScore: 72,
    },
    {
      id: "P002",
      name: "●●●●●●●●",
      age: "██",
      gender: "●",
      diagnosis: "████████████",
      status: "Active",
      riskScore: 45,
    },
    {
      id: "P003",
      name: "●●●●●●●●",
      age: "██",
      gender: "●",
      diagnosis: "████████████",
      status: "Discharged",
      riskScore: 23,
    },
    {
      id: "P004",
      name: "●●●●●●●●",
      age: "██",
      gender: "●",
      diagnosis: "████████████",
      status: "Critical",
      riskScore: 89,
    },
    {
      id: "P005",
      name: "●●●●●●●●",
      age: "██",
      gender: "●",
      diagnosis: "████████████",
      status: "Active",
      riskScore: 56,
    },
  ],
  vitals: Array.from({ length: 14 }, (_, i) => ({
    date: format(subDays(new Date(), 13 - i), "MMM dd"),
    heartRate: Math.floor(Math.random() * 30) + 60,
    bloodPressure: Math.floor(Math.random() * 40) + 100,
  })),
  labResults: [
    { name: "Glucose", value: "███", unit: "mg/dL", status: "normal" },
    { name: "Cholesterol", value: "███", unit: "mg/dL", status: "high" },
    { name: "Hemoglobin", value: "██.█", unit: "g/dL", status: "normal" },
    { name: "WBC Count", value: "█.█", unit: "K/uL", status: "normal" },
  ],
  recordsByType: [
    { name: "PII", value: 35 },
    { name: "Medical", value: 28 },
    { name: "Financial", value: 22 },
    { name: "Legal", value: 15 },
  ],
  activityTimeline: Array.from({ length: 7 }, (_, i) => ({
    day: format(subDays(new Date(), 6 - i), "EEE"),
    uploads: Math.floor(Math.random() * 20) + 5,
    reveals: Math.floor(Math.random() * 10) + 2,
  })),
});

const generateDecryptedMockData = () => ({
  patients: [
    {
      id: "P001",
      name: "John Smith",
      age: "45",
      gender: "M",
      diagnosis: "Type 2 Diabetes",
      status: "Active",
      riskScore: 72,
    },
    {
      id: "P002",
      name: "Sarah Johnson",
      age: "32",
      gender: "F",
      diagnosis: "Hypertension",
      status: "Active",
      riskScore: 45,
    },
    {
      id: "P003",
      name: "Michael Davis",
      age: "58",
      gender: "M",
      diagnosis: "Post-Surgery Recovery",
      status: "Discharged",
      riskScore: 23,
    },
    {
      id: "P004",
      name: "Emily Brown",
      age: "67",
      gender: "F",
      diagnosis: "Cardiac Arrhythmia",
      status: "Critical",
      riskScore: 89,
    },
    {
      id: "P005",
      name: "Robert Wilson",
      age: "41",
      gender: "M",
      diagnosis: "Chronic Kidney Disease",
      status: "Active",
      riskScore: 56,
    },
  ],
  labResults: [
    { name: "Glucose", value: "98", unit: "mg/dL", status: "normal" },
    { name: "Cholesterol", value: "245", unit: "mg/dL", status: "high" },
    { name: "Hemoglobin", value: "14.2", unit: "g/dL", status: "normal" },
    { name: "WBC Count", value: "7.5", unit: "K/uL", status: "normal" },
  ],
});

// ==================== STAT CARD ====================
const StatCard = ({
  icon,
  title,
  value,
  trend,
  trendValue,
  color = "purple",
}) => {
  const colorClasses = {
    purple: "bg-purple-50 text-purple-600",
    green: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-100 p-5">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trend === "up"
                ? "text-emerald-600"
                : trend === "down"
                  ? "text-red-500"
                  : "text-zinc-400"
            }`}
          >
            {trend === "up" ? (
              <TrendingUpOutlinedIcon fontSize="inherit" />
            ) : trend === "down" ? (
              <TrendingDownOutlinedIcon fontSize="inherit" />
            ) : (
              <RemoveOutlinedIcon fontSize="inherit" />
            )}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-zinc-900 mt-3">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{title}</p>
    </div>
  );
};

// ==================== PATIENT ROW ====================
const PatientRow = ({ patient, isDecrypted }) => {
  const statusStyles = {
    Active: "bg-emerald-50 text-emerald-700",
    Discharged: "bg-zinc-100 text-zinc-600",
    Critical: "bg-red-50 text-red-700",
  };

  return (
    <tr className="border-b border-zinc-50 hover:bg-zinc-50/50">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">
            {isDecrypted ? patient.name.charAt(0) : "●"}
          </div>
          <span
            className={`text-sm font-medium ${isDecrypted ? "text-zinc-800" : "text-zinc-400"}`}
          >
            {patient.name}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-zinc-600">{patient.id}</td>
      <td
        className={`py-3 px-4 text-sm ${isDecrypted ? "text-zinc-600" : "text-zinc-400"}`}
      >
        {patient.age}
      </td>
      <td
        className={`py-3 px-4 text-sm ${isDecrypted ? "text-zinc-600" : "text-zinc-400"}`}
      >
        {patient.diagnosis}
      </td>
      <td className="py-3 px-4">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[patient.status]}`}
        >
          {patient.status}
        </span>
      </td>
    </tr>
  );
};

// ==================== LAB RESULT ROW ====================
const LabResultRow = ({ result, isDecrypted }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-zinc-50 last:border-0">
    <div className="flex items-center gap-2">
      <ScienceOutlinedIcon fontSize="small" className="text-purple-400" />
      <span className="text-sm text-zinc-700">{result.name}</span>
    </div>
    <div className="flex items-center gap-2">
      <span
        className={`text-sm font-semibold ${isDecrypted ? "text-zinc-800" : "text-zinc-400"}`}
      >
        {result.value}
      </span>
      <span className="text-xs text-zinc-400">{result.unit}</span>
      {result.status === "high" && (
        <span className="w-2 h-2 rounded-full bg-red-500"></span>
      )}
    </div>
  </div>
);

// ==================== DECRYPTION MODAL ====================
const DecryptionModal = ({ isOpen, onClose, onDecrypt }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    onDecrypt(password);
    setLoading(false);
    setPassword("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="p-5 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <LockOutlinedIcon />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-800">
                Decrypt Data
              </h3>
              <p className="text-xs text-zinc-500">Enter encryption password</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            placeholder="Enter password"
            autoFocus
          />
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "Decrypting..." : "Decrypt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD ====================
const HealthcareDashboard = () => {
  const { user } = useAuth();
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [encryptedData, setEncryptedData] = useState(null);
  const [decryptedData, setDecryptedData] = useState(null);
  const [stats, setStats] = useState({ recordsCount: 0, revealsCount: 0 });

  useEffect(() => {
    setEncryptedData(generateEncryptedMockData());
    const fetchStats = async () => {
      try {
        const res = await apiClient
          .get("/records", { params: { page: 1, pageSize: 1 } })
          .catch(() => ({ data: { data: { pagination: { total: 0 } } } }));
        setStats({
          recordsCount: res.data?.data?.pagination?.total || 5,
          revealsCount: Math.floor(Math.random() * 50) + 10,
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, []);

  const handleDecrypt = () => {
    setDecryptedData(generateDecryptedMockData());
    setIsDecrypted(true);
  };

  const handleLock = () => {
    setIsDecrypted(false);
    setDecryptedData(null);
  };

  const currentData = useMemo(() => {
    if (!encryptedData) return null;
    return {
      ...encryptedData,
      patients:
        isDecrypted && decryptedData
          ? decryptedData.patients
          : encryptedData.patients,
      labResults:
        isDecrypted && decryptedData
          ? decryptedData.labResults
          : encryptedData.labResults,
    };
  }, [encryptedData, decryptedData, isDecrypted]);

  const exportToExcel = () => {
    if (!currentData || !isDecrypted) return alert("Decrypt data first");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(currentData.patients),
      "Patients",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(currentData.labResults),
      "Lab Results",
    );
    saveAs(
      new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      `CipherVault_Export_${format(new Date(), "yyyy-MM-dd")}.xlsx`,
    );
  };

  if (!currentData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              isDecrypted
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {isDecrypted ? (
              <LockOpenOutlinedIcon fontSize="inherit" />
            ) : (
              <LockOutlinedIcon fontSize="inherit" />
            )}
            {isDecrypted ? "Decrypted" : "Encrypted"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDecrypted ? (
            <button
              onClick={handleLock}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-medium hover:bg-zinc-200"
            >
              <LockOutlinedIcon fontSize="inherit" /> Lock
            </button>
          ) : (
            <button
              onClick={() => setShowDecryptModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700"
            >
              <LockOpenOutlinedIcon fontSize="inherit" /> Decrypt
            </button>
          )}
          <button
            onClick={exportToExcel}
            disabled={!isDecrypted}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              isDecrypted
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
            }`}
          >
            <FileDownloadOutlinedIcon fontSize="inherit" /> Export
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<DescriptionOutlinedIcon fontSize="small" />}
          title="Total Records"
          value={stats.recordsCount}
          trend="up"
          trendValue="+12%"
          color="purple"
        />
        <StatCard
          icon={<PeopleOutlineIcon fontSize="small" />}
          title="Active Patients"
          value={
            currentData.patients.filter((p) => p.status === "Active").length
          }
          trend="stable"
          trendValue="0%"
          color="blue"
        />
        <StatCard
          icon={<LockOpenOutlinedIcon fontSize="small" />}
          title="Data Reveals"
          value={stats.revealsCount}
          trend="up"
          trendValue="+8%"
          color="green"
        />
        <StatCard
          icon={<WarningAmberOutlinedIcon fontSize="small" />}
          title="Critical Cases"
          value={
            currentData.patients.filter((p) => p.status === "Critical").length
          }
          trend="down"
          trendValue="-2"
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white rounded-xl border border-zinc-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-800">
              Vitals Overview
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                Heart Rate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-300"></span>
                Blood Pressure
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={currentData.vitals}>
              <defs>
                <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b21a8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6b21a8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="heartRate"
                stroke="#6b21a8"
                strokeWidth={2}
                fill="url(#hrGrad)"
                name="Heart Rate"
              />
              <Area
                type="monotone"
                dataKey="bloodPressure"
                stroke="#c084fc"
                strokeWidth={2}
                fill="url(#bpGrad)"
                name="Blood Pressure"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-zinc-100 p-5">
          <h3 className="text-sm font-semibold text-zinc-800 mb-4">
            Records by Type
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={currentData.recordsByType}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {currentData.recordsByType.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {currentData.recordsByType.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[i] }}
                ></span>
                <span className="text-zinc-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-zinc-100">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-800">
              Patient Records
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isDecrypted
                ? "Showing decrypted data"
                : "Data encrypted — decrypt to view"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 text-xs text-zinc-500 uppercase">
                  <th className="py-2.5 px-4 text-left font-medium">Patient</th>
                  <th className="py-2.5 px-4 text-left font-medium">ID</th>
                  <th className="py-2.5 px-4 text-left font-medium">Age</th>
                  <th className="py-2.5 px-4 text-left font-medium">
                    Diagnosis
                  </th>
                  <th className="py-2.5 px-4 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {currentData.patients.map((patient) => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    isDecrypted={isDecrypted}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-zinc-100 p-5">
            <h3 className="text-sm font-semibold text-zinc-800 mb-3">
              Lab Results
            </h3>
            {currentData.labResults.map((result, i) => (
              <LabResultRow key={i} result={result} isDecrypted={isDecrypted} />
            ))}
          </div>

          <div className="bg-white rounded-xl border border-zinc-100 p-5">
            <h3 className="text-sm font-semibold text-zinc-800 mb-3">
              Security
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-600">HIPAA Compliance</span>
                  <span className="font-medium text-emerald-600">94%</span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full">
                  <div className="h-full w-[94%] bg-emerald-500 rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-600">Encryption</span>
                  <span className="font-medium text-purple-600">100%</span>
                </div>
                <div className="h-1.5 bg-zinc-100 rounded-full">
                  <div className="h-full w-full bg-purple-600 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-zinc-100">
              <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-medium rounded">
                <CheckCircleOutlineIcon style={{ fontSize: 12 }} /> AES-256
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-medium rounded">
                <CheckCircleOutlineIcon style={{ fontSize: 12 }} /> PBKDF2
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-medium rounded">
                <CheckCircleOutlineIcon style={{ fontSize: 12 }} />{" "}
                Zero-Knowledge
              </span>
            </div>
          </div>
        </div>
      </div>

      <DecryptionModal
        isOpen={showDecryptModal}
        onClose={() => setShowDecryptModal(false)}
        onDecrypt={handleDecrypt}
      />
    </>
  );
};

export default HealthcareDashboard;
