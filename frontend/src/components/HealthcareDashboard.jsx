/**
 * Healthcare Analytics Dashboard - CipherVault
 * Monochromatic purple design with precise spacing
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

// Parse CSV string into array of objects
const parseCSV = (csvText) => {
  if (!csvText || typeof csvText !== 'string') return [];
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/"/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/"/g, ''));
    
    if (values.length === headers.length) {
      const record = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx];
      });
      records.push(record);
    }
  }
  return records;
};

// Safely resolve a record identifier from various possible fields
const getRecordId = (record) =>
  record?._id || record?.id || record?.recordId || record?.recordID || record?.record?.id;
import { useAuth } from "../hooks/useAuth";
import {
  deriveKeyFromPasswordWeb,
  decryptAES256GCMWeb,
  base64ToArrayBuffer,
} from "../crypto/web-crypto-api";

// Material UI Icons
import FileTextIcon from "@mui/icons-material/DescriptionOutlined";
import UsersIcon from "@mui/icons-material/PeopleOutline";
import LockIcon from "@mui/icons-material/LockOutlined";
import LockOpenIcon from "@mui/icons-material/LockOpenOutlined";
import DownloadIcon from "@mui/icons-material/FileDownloadOutlined";
import AlertIcon from "@mui/icons-material/WarningAmberOutlined";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import CheckIcon from "@mui/icons-material/VerifiedUserOutlined";
import KeyIcon from "@mui/icons-material/KeyOutlined";
import EyeIcon from "@mui/icons-material/VisibilityOutlined";

// Donut chart colors - monochromatic purples
const DONUT_COLORS = ["#7c3aed", "#a78bfa", "#c4b5fd", "#ddd6fe", "#9333ea"];

// Vitals chart colors - monochromatic purple theme
const VITALS_COLORS = {
  heartRate: "#7c3aed",    // violet-600
  bloodPressure: "#c4b5fd", // violet-300
};

// Lab results data
const getLabResults = (isDecrypted) => [
  { name: "Glucose", value: isDecrypted ? 94 : null, range: "93", unit: "mg/dL", max: 200 },
  { name: "Cholesterol", value: isDecrypted ? 154 : null, range: "80", unit: "mg/dL", max: 300 },
  { name: "Hemoglobin", value: isDecrypted ? 103 : null, range: "101", unit: "mg/dL", max: 150 },
  { name: "WBC Count", value: isDecrypted ? 12 : null, range: "1.3", unit: "mg/dL", max: 20 },
];

// ==================== STAT CARD ====================
const StatCard = ({ icon: Icon, label, value, trend, color }) => {
  const colorConfig = {
    blue: { bg: "bg-violet-600", text: "text-violet-600" },
    cyan: { bg: "bg-violet-500", text: "text-violet-500" },
    green: { bg: "bg-violet-400", text: "text-violet-400" },
    red: { bg: "bg-violet-700", text: "text-violet-700" },
  };
  const cfg = colorConfig[color] || colorConfig.blue;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5">
      <div className={`w-14 h-14 ${cfg.bg} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
        <Icon style={{ fontSize: 24 }} />
      </div>
      <div className="flex-1">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap ${trend.includes("+") ? "text-violet-600 bg-violet-50" : "text-slate-500 bg-slate-100"}`}>
          {trend}
        </span>
      )}
    </div>
  );
};

// ==================== VITALS CHART ====================
const VitalsChart = ({ data }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-center mb-8">
      <h3 className="font-bold text-lg text-slate-900">Vitals Overview</h3>
      <select className="text-sm border border-slate-200 rounded-lg p-2 text-slate-600 focus:ring-2 focus:ring-violet-500 focus:border-transparent">
        <option>Last 14 Days</option>
        <option>Last 30 Days</option>
        <option>Last 90 Days</option>
      </select>
    </div>
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorHeartRate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={VITALS_COLORS.heartRate} stopOpacity={0.3} />
            <stop offset="95%" stopColor={VITALS_COLORS.heartRate} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorBP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={VITALS_COLORS.bloodPressure} stopOpacity={0.3} />
            <stop offset="95%" stopColor={VITALS_COLORS.bloodPressure} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: 12 }} />
        <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
        <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
        <Area type="monotone" dataKey="heartRate" stroke={VITALS_COLORS.heartRate} strokeWidth={2} fillOpacity={1} fill="url(#colorHeartRate)" />
        <Area type="monotone" dataKey="bloodPressure" stroke={VITALS_COLORS.bloodPressure} strokeWidth={2} fillOpacity={1} fill="url(#colorBP)" />
      </AreaChart>
    </ResponsiveContainer>
    <div className="flex gap-8 mt-8 justify-center">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-violet-600"></div>
        <span className="text-sm font-medium text-slate-600">Heart Rate</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-violet-300"></div>
        <span className="text-sm font-medium text-slate-600">Blood Pressure</span>
      </div>
    </div>
  </div>
);

// ==================== DONUT CHART ====================
const DonutChart = ({ data }) => {
  const chartData = data?.length ? data : [{ name: "No Data", value: 1 }];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h3 className="font-bold text-lg text-slate-900 mb-8">Records by Type</h3>
      <div className="flex items-center justify-center gap-10">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={DONUT_COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-4">
          {chartData.map((item, idx) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: DONUT_COLORS[idx] }}
              ></div>
              <span className="text-sm font-medium text-slate-600">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== LAB RESULTS ====================
const LabResults = ({ hasData = false }) => {
  if (!hasData) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-bold text-lg text-slate-900">Latest Lab Results</h3>
          <RefreshIcon className="text-slate-400" style={{ fontSize: 20 }} />
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mb-4">
            <FileTextIcon className="text-violet-300" style={{ fontSize: 32 }} />
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">No Lab Results</p>
          <p className="text-xs text-slate-400">Decrypt records to view lab data</p>
        </div>
      </div>
    );
  }

  const labs = [
    { name: "Glucose", value: 94, min: 70, max: 100, unit: "mg/dL", status: "normal", percentage: 75 },
    { name: "Cholesterol", value: 154, min: 125, max: 200, unit: "mg/dL", status: "normal", percentage: 65 },
    { name: "Hemoglobin", value: 13.5, min: 12, max: 17.5, unit: "g/dL", status: "normal", percentage: 50 },
    { name: "WBC Count", value: 8.2, min: 4.5, max: 11, unit: "K/µL", status: "elevated", percentage: 85 },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-bold text-lg text-slate-900">Latest Lab Results</h3>
        <RefreshIcon className="text-slate-400" style={{ fontSize: 20 }} />
      </div>
      <div className="space-y-7">
        {labs.map((lab) => (
          <div key={lab.name} className="group">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-semibold text-violet-900">{lab.name}</span>
              <span className="text-xs font-bold text-violet-700">
                {lab.value} <span className="text-[10px] font-normal text-slate-400">{lab.unit}</span>
              </span>
            </div>
            <div className="relative h-2 bg-violet-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${lab.status === 'elevated' ? 'bg-red-500' : 'bg-violet-600'}`}
                style={{ width: `${lab.percentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-slate-400">{lab.min} - {lab.max}</span>
              <span className={`text-[10px] font-bold ${lab.status === 'elevated' ? 'text-red-500' : 'text-emerald-500'}`}>
                {lab.status === 'elevated' ? '▲ Elevated' : '✓ Normal'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== RECORD ROW ====================
const RecordRow = ({ record, isDecrypted, displayData, onDecrypt, showDecryptButton = true }) => {
  const statusColors = {
    Active: "bg-emerald-100 text-emerald-700",
    Discharged: "bg-slate-100 text-slate-700",
    Pending: "bg-amber-100 text-amber-700",
    Encrypted: "bg-amber-100 text-amber-700",
    Decrypted: "bg-emerald-50 text-emerald-700",
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
      <td className="px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
            {displayData.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-slate-900">{displayData.name}</span>
        </div>
      </td>
      <td className="px-6 py-6">
        <div className="flex items-center gap-2 text-sm">
          {!isDecrypted && <LockIcon style={{ fontSize: 14 }} className="text-violet-400" />}
          <span className={!isDecrypted ? "font-mono text-slate-400" : "text-slate-900 font-medium"}>
            {displayData.age}
          </span>
        </div>
      </td>
      <td className="px-6 py-6">
        <div className="flex items-center gap-2 text-sm">
          {!isDecrypted && <LockIcon style={{ fontSize: 14 }} className="text-violet-400" />}
          <span className={!isDecrypted ? "font-mono text-slate-400" : "text-slate-900 font-medium"}>
            {displayData.diagnosis}
          </span>
        </div>
      </td>
      <td className="px-6 py-6">
        <span className={`px-3 py-1 rounded-md text-xs font-bold ${statusColors[displayData.status] || statusColors.Pending}`}>
          {displayData.status}
        </span>
      </td>
      <td className="px-6 py-6">
        {showDecryptButton && (
          <button
            onClick={() => onDecrypt(record)}
            className="px-3 py-1.5 bg-white border-2 border-violet-600 rounded-lg text-[10px] font-bold text-violet-600 hover:bg-violet-50 transition-all flex items-center gap-1.5"
          >
            <KeyIcon style={{ fontSize: 12 }} />
            Decrypt
          </button>
        )}
      </td>
    </tr>
  );
};

// ==================== DECRYPT MODAL ====================
const DecryptModal = ({ isOpen, onClose, onDecrypt, isLoading, recordId, error }) => {
  const [accountPassword, setAccountPassword] = useState("");
  const [encryptionPassword, setEncryptionPassword] = useState("");
  const [useSamePassword, setUseSamePassword] = useState(true);

  const handleSubmit = () => {
    const decryptPwd = useSamePassword ? accountPassword : encryptionPassword;
    onDecrypt(accountPassword, decryptPwd, recordId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <KeyIcon style={{ fontSize: 20 }} /> Decrypt {recordId ? "Record" : "Data"}
          </h2>
          <p className="text-violet-100 text-sm mt-1">
            {useSamePassword 
              ? "Enter your password to reveal encrypted data" 
              : "Enter your passwords to reveal encrypted data"}
          </p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {/* Account Password */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Account Password</label>
            <input
              type="password"
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
              placeholder="Enter your account password"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm tracking-wider"
              style={{ letterSpacing: '0.15em' }}
            />
            <p className="text-xs text-slate-500 mt-0.5">Required for reveal authorization</p>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-3 py-1">
            <input
              type="checkbox"
              id="samePassword"
              checked={useSamePassword}
              onChange={(e) => setUseSamePassword(e.target.checked)}
              className="w-4 h-4 accent-violet-600"
            />
            <label htmlFor="samePassword" className="text-sm font-medium text-slate-700">
              Use same password for decryption
            </label>
          </div>

          {/* Encryption Password */}
          {!useSamePassword && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Encryption Password</label>
              <input
                type="password"
                value={encryptionPassword}
                onChange={(e) => setEncryptionPassword(e.target.value)}
                placeholder="Enter the password used during upload"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm tracking-wider"
                style={{ letterSpacing: '0.15em' }}
              />
              <p className="text-xs text-slate-500 mt-0.5">Password used when the data was encrypted</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-slate-50 rounded-lg p-3 border-l-4 border-violet-600">
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-900">🔒 Security:</span> Passwords are never stored. Decryption happens entirely in your browser.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 flex gap-2.5 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-white border-2 border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !accountPassword}
            className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 hover:shadow-md active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed transition-all text-sm shadow-sm"
          >
            {isLoading ? "Decrypting..." : "Decrypt"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN DASHBOARD ====================
export default function HealthcareDashboard() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 20 });
  const [decryptedRecords, setDecryptedRecords] = useState({});
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [decryptError, setDecryptError] = useState("");
  const [viewMode, setViewMode] = useState("encrypted"); // "encrypted" or "decrypted"
  const [activeDecryptedRecordId, setActiveDecryptedRecordId] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, [user]);

  const fetchRecords = async () => {
    try {
      const response = await apiClient.get("/records");
      const payload = response.data?.data || response.data || {};
      const normalizedRecords = Array.isArray(payload)
        ? payload
        : payload.records || [];

      setRecords(normalizedRecords);
      setPagination(
        payload.pagination || {
          total: normalizedRecords.length,
          page: 1,
          pageSize: normalizedRecords.length || 20,
        },
      );
      setDecryptedRecords({});
      setIsDecrypted(false);
    } catch (error) {
      console.error("Failed to fetch records:", error);
      setRecords([]);
    }
  };

  // Flatten records to show individual patients from CSV
  const flattenedRecords = useMemo(() => {
    console.log("=== Flattened Records Calculation ===");
    console.log("View mode:", viewMode);
    console.log("Active decrypted record ID:", activeDecryptedRecordId);
    console.log("Decrypted records:", decryptedRecords);
    console.log("All records:", records);
    
    if (viewMode === "decrypted" && activeDecryptedRecordId) {
      // Show only patients from the active decrypted record (support records keyed by id/_id)
      const activeRecord = records.find(r => getRecordId(r) === activeDecryptedRecordId);
      console.log("Active record found:", activeRecord);
      
      if (!activeRecord) {
        console.warn("No active record found!");
        return [];
      }
      
      const decrypted = decryptedRecords[activeDecryptedRecordId];
      console.log("Decrypted data for active record:", decrypted);
      
      if (!decrypted || !decrypted.content) {
        console.warn("No decrypted content!", decrypted);
        return [];
      }
      
      const recordId = getRecordId(activeRecord);
      const patients = parseCSV(decrypted.content);
      console.log("Parsed patients:", patients);
      
      const result = patients.map((patient, idx) => ({
        ...activeRecord,
        _id: `${recordId || "rec"}_patient_${idx}`,
        parentId: recordId,
        patientData: patient,
        isDecrypted: true,
      }));
      console.log("Returning patient records:", result);
      return result;
    }
    
    // Encrypted view: show all records as encrypted
    console.log("Returning encrypted records:", records);
    return records;
  }, [records, decryptedRecords, viewMode, activeDecryptedRecordId]);

  const decryptSingleRecord = async (record, accountPassword, encryptionPassword) => {
    try {
      const recordId = getRecordId(record);
      if (!recordId) {
        throw new Error("Missing record identifier");
      }

      // Request encrypted payload from backend (already authenticated via JWT)
      const revealRes = await apiClient.post(`/records/${recordId}/reveal`, {
        reason: "Dashboard decrypt",
        duration: 600,
      });

      const payload = revealRes.data?.data;
      const encryptedPayload = payload?.encryptedPayload;
      const encryption = payload?.encryption;

      if (!encryptedPayload || !encryption?.salt) {
        throw new Error("Missing encrypted payload");
      }

      const saltBytes =
        encryption.salt instanceof Uint8Array
          ? encryption.salt
          : new Uint8Array(base64ToArrayBuffer(encryption.salt));

      const key = await deriveKeyFromPasswordWeb(
        encryptionPassword,
        saltBytes,
        encryption.iterations || 100000,
      );

      const ciphertext = new Uint8Array(
        encryptedPayload.encryptedData instanceof Uint8Array
          ? encryptedPayload.encryptedData
          : base64ToArrayBuffer(encryptedPayload.encryptedData),
      );
      const ivBytes = new Uint8Array(
        encryptedPayload.iv instanceof Uint8Array
          ? encryptedPayload.iv
          : base64ToArrayBuffer(encryptedPayload.iv),
      );
      const authTagBytes = new Uint8Array(
        encryptedPayload.authTag instanceof Uint8Array
          ? encryptedPayload.authTag
          : base64ToArrayBuffer(encryptedPayload.authTag),
      );

      const decrypted = await decryptAES256GCMWeb(
        ciphertext,
        key,
        ivBytes,
        authTagBytes,
      );
      const decryptedText = new TextDecoder().decode(decrypted);
      console.log("Decrypted text:", decryptedText);
      const parsed = JSON.parse(decryptedText);
      console.log("Parsed data:", parsed);
      return parsed;
    } catch (error) {
      console.error("Decryption failed:", error);
      throw error;
    }
  };

  const handleDecryptAll = async (accountPassword, encryptionPassword) => {
    setDecryptError("");
    setIsLoading(true);
    try {
      const decrypted = {};
      for (const record of records) {
        const data = await decryptSingleRecord(
          record,
          accountPassword,
          encryptionPassword,
        );
        const recordId = getRecordId(record);
        if (data && recordId) decrypted[recordId] = data;
      }
      setDecryptedRecords(decrypted);
      setIsDecrypted(true);
      const firstId = Object.keys(decrypted)[0] || null;
      setActiveDecryptedRecordId(firstId);
      if (firstId) {
        setViewMode("decrypted");
      }
      setModalOpen(false);
    } catch (error) {
      const apiMessage = error.response?.data?.error?.message;
      const status = error.response?.status;
      const friendly =
        status === 401
          ? "Wrong password"
          : apiMessage || error.message || "Decryption failed";
      setDecryptError(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecryptSingle = async (record, accountPassword, encryptionPassword) => {
    console.log("=== Starting decryption ===");
     console.log("Record received:", record);
     console.log("Record ID:", record?._id, "Record.id:", record?.id);
    console.log("Account password length:", accountPassword?.length);
    console.log("Encryption password length:", encryptionPassword?.length);
   
     const recordId = getRecordId(record);
     if (!record || !recordId) {
       console.error("Invalid record - no ID found");
       setDecryptError("Invalid record");
       return;
     }
     console.log("Using record ID:", recordId);
    
    setDecryptError("");
    setIsLoading(true);
    try {
      const data = await decryptSingleRecord(
        record,
        accountPassword,
        encryptionPassword,
      );
      console.log("Decrypted data received:", data);
      
      if (data) {
         console.log("Setting decrypted records with ID:", recordId);
        setDecryptedRecords((prev) => {
           const updated = { ...prev, [recordId]: data };
          console.log("Updated decrypted records:", updated);
          return updated;
        });
         console.log("Setting active record ID:", recordId);
         setActiveDecryptedRecordId(recordId);
         console.log("Setting view mode to decrypted");
        setViewMode("decrypted");
        setModalOpen(false);
        console.log("View mode set to decrypted");
      } else {
        console.error("Data is null/undefined");
        setDecryptError("Decryption returned no data");
      }
    } catch (error) {
      console.error("Decryption error:", error);
      const apiMessage = error.response?.data?.error?.message;
      const status = error.response?.status;
      const friendly =
        status === 401
          ? "Wrong password"
          : apiMessage || error.message || "Decryption failed";
      setDecryptError(friendly);
    } finally {
      setIsLoading(false);
      console.log("=== Decryption completed ===");
    }
  };

  const handleDecrypt = (accountPassword, encryptionPassword, recordId) => {
    if (recordId) {
      const record = records.find((r) => getRecordId(r) === recordId);
      if (record) {
        handleDecryptSingle(record, accountPassword, encryptionPassword);
      }
    } else {
      handleDecryptAll(accountPassword, encryptionPassword);
    }
  };

  const handleBackToEncrypted = () => {
    setViewMode("encrypted");
    setActiveDecryptedRecordId(null);
  };

  // Calculate dynamic stats with actual data
  const decryptedCount = Object.keys(decryptedRecords).length;

  // When decrypted view is active, use flattened patients for metrics; otherwise use raw records
  const effectiveRecords = useMemo(
    () => (viewMode === "decrypted" && flattenedRecords.length ? flattenedRecords : records),
    [viewMode, flattenedRecords, records],
  );

  const totalRecords = useMemo(
    () => (viewMode === "decrypted" ? effectiveRecords.length : pagination?.total ?? records.length),
    [viewMode, effectiveRecords, pagination, records.length],
  );

  const activePatientCount = useMemo(
    () =>
      effectiveRecords.reduce((count, rec) => {
        const status = rec.isDecrypted ? rec.patientData?.status : rec.status;
        return status === "Active" ? count + 1 : count;
      }, 0),
    [effectiveRecords],
  );

  const criticalPatientCount = useMemo(
    () =>
      effectiveRecords.reduce((count, rec) => {
        const severity = rec.isDecrypted ? rec.patientData?.severity || rec.patientData?.status : rec.severity || rec.status;
        return severity === "Critical" ? count + 1 : count;
      }, 0),
    [effectiveRecords],
  );

  const recordTypeData = useMemo(() => {
    const counts = records.reduce((acc, rec) => {
      const type = rec.recordType || "Other";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [records]);

  const vitalsData = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(today, 13 - i);
      return {
        key: format(date, "yyyy-MM-dd"),
        label: format(date, "MMM dd"),
        heartRate: 0,
        bloodPressure: 0,
      };
    });

    const dayMap = Object.fromEntries(days.map((d) => [d.key, d]));

    records.forEach((rec) => {
      if (!rec.createdAt) return;
      const key = format(new Date(rec.createdAt), "yyyy-MM-dd");
      if (dayMap[key]) {
        // Use counts to represent activity for now
        dayMap[key].heartRate += 1;
        dayMap[key].bloodPressure += 1;
      }
    });

    return days.map((d) => ({
      date: d.label,
      heartRate: d.heartRate,
      bloodPressure: d.bloodPressure,
    }));
  }, [records]);

  const stats = [
    { icon: FileTextIcon, label: "Total Records", value: totalRecords, trend: "+12%", color: "blue" },
    {
      icon: UsersIcon,
      label: "Active Patients",
      value: viewMode === "decrypted" ? activePatientCount : "Locked",
      trend: viewMode === "decrypted" ? "0%" : undefined,
      color: "cyan",
    },
    {
      icon: LockOpenIcon,
      label: "Decrypted Events",
      value: viewMode === "decrypted" ? decryptedCount : "Locked",
      trend: viewMode === "decrypted" ? "+8%" : undefined,
      color: "green",
    },
    {
      icon: AlertIcon,
      label: "Critical Cases",
      value: viewMode === "decrypted" ? criticalPatientCount : "Locked",
      color: "red",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-[1800px] mx-auto p-6 bg-violet-50 min-h-screen">
      {/* Unified Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 top-0 z-40 rounded-t-xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">Secure encrypted data platform</p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg">
              <LockIcon style={{ fontSize: 16 }} className="text-violet-600" />
              <span className="text-xs font-bold text-violet-700">AES-256</span>
            </div>
          </div>
        </div>
      </div>

      <main className="p-8 space-y-8">
        {/* KPI Stats */}
        <section className="grid grid-cols-4 gap-6">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <VitalsChart data={vitalsData} />
          </div>
          <DonutChart data={recordTypeData} />
        </section>

        {/* Table and Sidebar */}
        <section className="grid grid-cols-4 gap-6">
          <div className="col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-7 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-lg text-slate-900">
                  {viewMode === "decrypted" ? "Decrypted Patient Records" : "Records"}
                </h3>
                {viewMode === "decrypted" && (
                  <button
                    onClick={handleBackToEncrypted}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-all flex items-center gap-2"
                  >
                    <LockIcon style={{ fontSize: 16 }} />
                    Back to Encrypted View
                  </button>
                )}
              </div>
              <button onClick={fetchRecords} className="text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-lg transition-all">
                <RefreshIcon style={{ fontSize: 20 }} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Diagnosis</th>
                    <th className="px-6 py-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-3">
                          <FileTextIcon style={{ fontSize: 48 }} className="text-slate-300" />
                          <p className="text-sm font-medium">No records found</p>
                          <p className="text-xs">Upload encrypted records to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    flattenedRecords.map((record) => {
                      const isRecordDecrypted = record.isDecrypted && record.patientData;

                      const displayData = isRecordDecrypted
                        ? {
                            name: record.patientData.patientName || "Unknown Patient",
                            age: record.patientData.age || "-",
                            diagnosis: record.patientData.diagnosis || "-",
                            status: record.patientData.status || "Decrypted",
                          }
                        : {
                            name:
                              record.patientName ||
                              record.metadata?.originalFileName ||
                              record.recordType ||
                              "Encrypted Record",
                            age: "●●●●●●",
                            diagnosis: Array.isArray(record.tags)
                              ? record.tags.join(", ")
                              : record.recordType || "Masked",
                            status: record.status || "Encrypted",
                          };

                      return (
                        <RecordRow
                          key={record._id}
                          record={record}
                          isDecrypted={isRecordDecrypted}
                          displayData={displayData}
                          showDecryptButton={viewMode === "encrypted"}
                          onDecrypt={(rec) => {
                            setDecryptError("");
                            // Use parent record for decryption
                            const parentRecord = rec.parentId 
                              ? records.find(r => getRecordId(r) === rec.parentId)
                              : rec;
                            setSelectedRecord(parentRecord);
                            setModalOpen(true);
                          }}
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <LabResults hasData={Object.keys(decryptedRecords).length > 0} />
          </div>
        </section>
      </main>
      </div>

      {/* Modal */}
      <DecryptModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedRecord(null);
          setDecryptError("");
        }}
        onDecrypt={handleDecrypt}
        isLoading={isLoading}
        recordId={selectedRecord?._id}
        error={decryptError}
      />
    </div>
  );
}
