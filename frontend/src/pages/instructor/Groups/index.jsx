import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Calendar, User } from "lucide-react";
import api from "../../../api/axios";

const InstructorGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      setError("");
      try {
        const [adminChatGroupsRes, adminSectionGroupsRes] = await Promise.all([
          api.get("/api/admingroups/my-groups"),
          api.get("/api/admin/groups/instructor/my-groups"),
        ]);

        const adminChatGroups = (Array.isArray(adminChatGroupsRes.data) ? adminChatGroupsRes.data : []).map((group) => ({
          group_id: group.group_id,
          name: group.name,
          created_at: group.created_at,
          member_count: group.member_count ?? 0,
          source: "admin-chat",
        }));

        const adminSectionGroups = (Array.isArray(adminSectionGroupsRes.data) ? adminSectionGroupsRes.data : []).map((group) => ({
          group_id: group.group_id,
          name: group.group_name,
          created_at: group.created_at,
          member_count: group.user_count ?? 0,
          source: "admin-section",
        }));

        const merged = [...adminChatGroups, ...adminSectionGroups].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );

        setGroups(merged);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load groups");
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-[1440px] mx-auto space-y-6">
      <div
        className="relative overflow-hidden rounded-2xl p-6 lg:p-8"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)" }}
      >
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <Users size={24} className="text-indigo-300" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">My Groups</h1>
            <p className="text-slate-400 text-sm mt-0.5">Groups where admin has added you. Open any group to chat.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {groups.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No groups assigned yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Group Name</th>
                  <th className="py-3.5 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Created</th>
                  <th className="py-3.5 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Members</th>
                  <th className="py-3.5 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {groups.map((group) => (
                  <tr key={group.group_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-primary-900">{group.name}</td>
                    <td className="py-4 px-6 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-300" />
                        {group.created_at ? new Date(group.created_at).toLocaleDateString() : "—"}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-300" />
                        <span className="font-semibold">{group.member_count ?? 0}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/instructor/groups/${group.group_id}?source=${group.source}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition"
                      >
                        Open Chat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorGroups;
