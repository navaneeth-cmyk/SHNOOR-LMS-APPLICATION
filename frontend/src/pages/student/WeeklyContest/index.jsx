import React, { useEffect, useState } from "react";
import { Search, Filter, Calendar } from "lucide-react";
import api from "../../../api/axios";
import { useNavigate } from "react-router-dom";

const WeeklyContest = () => {

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");

  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // helpers
  // -----------------------------

  // ✅ Use start_at (fallback to created_at)
  const getStartDate = (contest) => {
    return contest.start_at
      ? new Date(contest.start_at)
      : contest.created_at
      ? new Date(contest.created_at)
      : null;
  };

  const computeEndDate = (contest) => {
    const start = getStartDate(contest);
    if (!start) return null;

    const value = Number(contest.validity_value || 0);
    const unit = contest.validity_unit;

    const end = new Date(start);

    if (unit === "day") end.setDate(end.getDate() + value);
    else if (unit === "week") end.setDate(end.getDate() + value * 7);
    else if (unit === "month") end.setMonth(end.getMonth() + value);
    else if (unit === "hour") end.setHours(end.getHours() + value);

    return end;
  };

  const computeStatus = (contest) => {
    const now = new Date();
    const start = getStartDate(contest);
    const end = computeEndDate(contest);

    if (!start) return "active";

    if (now < start) return "upcoming";
    if (end && now > end) return "ended";

    return "active";
  };

  // -----------------------------
  // fetch
  // -----------------------------

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const res = await api.get("/api/contests/available");

        const enriched = res.data.map((c) => ({
          ...c,
          status: computeStatus(c),
          endDate: computeEndDate(c)
        }));

        setContests(enriched);
      } catch (err) {
        console.error("Failed to load contests", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, []);

  // -----------------------------
  // filtering
  // -----------------------------

  const filteredContests = contests.filter((contest) => {
    const matchesTab = contest.status === activeTab;

    const matchesSearch =
      contest.title?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  if (loading) {
    return <div className="text-slate-500">Loading contests...</div>;
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900 tracking-tight">
            Weekly Contests
          </h1>
          <p className="text-slate-500 mt-1">
            Compete with peers, showcase your skills, and win rewards.
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          {["active", "upcoming", "ended"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all duration-200 ${
                activeTab === tab
                  ? "bg-primary-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search contests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-900/20 focus:border-primary-900 transition-all text-slate-600 placeholder:text-slate-400"
          />
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Grid */}
      {filteredContests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContests.map((contest) => (
            <div
              key={contest.exam_id}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
            >

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg text-primary-900">
                    {contest.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {contest.description}
                  </p>
                </div>

                <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 capitalize">
                  {contest.status}
                </span>
              </div>

              <div className="text-sm text-slate-500">
                Duration : {contest.duration} minutes
              </div>

              <div className="flex gap-2 pt-2">

                <button
                  className="px-3 py-1.5 text-sm border rounded hover:bg-slate-50"
                  onClick={() =>
                    navigate(`/student/contest/${contest.exam_id}`)
                  }
                >
                  Join
                </button>

                <button
                  className="px-3 py-1.5 text-sm border rounded hover:bg-slate-50"
                  onClick={() =>
                    navigate(`/student/contest/${contest.exam_id}/result`)
                  }
                >
                  Result
                </button>

                <button
                  className="px-3 py-1.5 text-sm border rounded hover:bg-slate-50"
                  onClick={() =>
                    navigate(`/student/contest/${contest.exam_id}/leaderboard`)
                  }
                >
                  Leaderboard
                </button>

              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-primary-900 mb-1">
            No contests found
          </h3>
          <p className="text-slate-500 text-sm max-w-md text-center">
            There are no {activeTab} contests matching your search.
          </p>
        </div>
      )}
    </div>
  );
};

export default WeeklyContest;