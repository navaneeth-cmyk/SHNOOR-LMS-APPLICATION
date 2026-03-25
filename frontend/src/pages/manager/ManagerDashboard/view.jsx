import React from "react";
import { Building, Mail, User, FileText } from "lucide-react";

const ManagerDashboardView = ({ loading, profile }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-400 font-medium text-sm">Loading manager dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans max-w-[1440px] mx-auto">
      <div className="relative overflow-hidden rounded-2xl p-6 lg:p-8" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)" }}>
        <div className="relative z-10">
          <p className="text-indigo-300 text-sm font-medium mb-1">Welcome</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Manager Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm">Your account details and access panel.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:p-8">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Profile Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
            <User className="text-indigo-600 mt-0.5" size={18} />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Name</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{profile.fullName || "-"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
            <Mail className="text-indigo-600 mt-0.5" size={18} />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{profile.email || "-"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
            <Building className="text-indigo-600 mt-0.5" size={18} />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">College</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{profile.college || "-"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
            <FileText className="text-indigo-600 mt-0.5" size={18} />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Bio</p>
              <p className="text-sm font-semibold text-slate-800 mt-1">{profile.bio || "-"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboardView;
