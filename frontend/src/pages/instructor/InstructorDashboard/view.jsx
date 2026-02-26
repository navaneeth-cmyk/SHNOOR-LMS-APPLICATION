import React, { useEffect, useRef, useState } from "react";
import {
  Users,
  BookOpen,
  Star,
  Plus,
  Folder,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import DateRangeFilter from "../../../components/DateRangeFilter";
import Papa from "papaparse";
const InstructorDashboardView = ({
  loading,
  userName,
  stats,
  navigate,
  onSearch,
  searchResults = [],
  searchLoading = false,
  dateRange = null,
  setDateRange = () => {},
}) => {
  const performanceData = [];
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsSearchExpanded(false);
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500 font-medium animate-pulse">
        Loading dashboard...
      </div>
    );
  }

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(value.trim());
    }, 400);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearchExpanded(false);
    onSearch("");
  };
  const handleDownload = () => {
    // Format the data with proper headers for CSV
    const formattedData = {
      "Report Type": "Instructor Dashboard Report",
      "Generated": new Date().toLocaleString(),
      "Date Range": dateRange 
        ? `${dateRange.startDate} to ${dateRange.endDate}` 
        : "All Time",
      "": "", // Empty row for spacing
      "Metric": "Value",
      "My Courses": stats.myCourses,
      "Total Students": stats.totalStudents,
      "Average Rating": stats.avgRating,
      "Courses Change (%)": stats.coursesChange,
      "Students Change (%)": stats.studentsChange,
    };

    const csv = Papa.unparse([formattedData]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `instructor-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };
  const handleCourseClick = (courseId) => {
    navigate(`/instructor/courses`);
    handleClearSearch();
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      Beginner: "bg-green-100 text-green-700",
      Intermediate: "bg-yellow-100 text-yellow-700",
      Advanced: "bg-red-100 text-red-700",
    };
    return colors[difficulty] || "bg-gray-100 text-gray-700";
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-6 font-sans text-primary-900">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Instructor Portal
            </h1>
            <p className="text-slate-500 mt-1">
              Welcome back, {userName}. Overview of your course performance.
            </p>
          </div>

          {/* Search Component */}
          <div className="flex items-end gap-4">
            <div className="relative">
              <div
                className={`relative transition-all duration-300 ${isSearchExpanded ? "w-96" : "w-64"}`}
              >
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  className="pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full transition-all shadow-sm"
                  placeholder="Search parameters..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setIsSearchExpanded(true)}
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {isSearchExpanded && searchQuery && (
                <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                  {searchLoading ? (
                    <div className="p-4 text-center text-slate-500">
                      Searching...
                    </div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => handleCourseClick(result.id)}
                        >
                          <div className="flex items-start gap-3">
                            {result.thumbnail_url ? (
                              <img
                                src={result.thumbnail_url}
                                alt={result.title}
                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <BookOpen
                                  className="text-indigo-600"
                                  size={24}
                                />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm text-slate-900 truncate">
                                  {result.title}
                                </h4>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${result.type === "module" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                                >
                                  {result.type === "module"
                                    ? "Module"
                                    : "Course"}
                                </span>
                              </div>

                              {result.instructor_name && (
                                <p className="text-xs text-indigo-600 font-medium mb-1">
                                  👤 {result.instructor_name}
                                </p>
                              )}

                              {result.type === "module" &&
                                result.course_title && (
                                  <p className="text-xs text-slate-500 font-medium mb-1">
                                    📚 In Course: {result.course_title}
                                  </p>
                                )}

                              <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                                {result.description ||
                                  "No description available"}
                              </p>

                              <div className="flex flex-wrap items-center gap-2">
                                {result.category && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                                    {result.category}
                                  </span>
                                )}
                                {result.difficulty && (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(result.difficulty)}`}
                                  >
                                    {result.difficulty}
                                  </span>
                                )}
                                {result.status && (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(result.status)}`}
                                  >
                                    {result.status}
                                  </span>
                                )}
                              </div>

                              {result.validity_value &&
                                result.validity_unit && (
                                  <p className="text-xs text-slate-500 mt-2">
                                    Valid for: {result.validity_value}{" "}
                                    {result.validity_unit}
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500">
                      No courses or modules found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Click outside to close search */}
        {isSearchExpanded && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsSearchExpanded(false)}
          />
        )}

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <KpiCard
            title="My Courses"
            value={stats.myCourses}
            trend="Active"
            isPositive
            icon={<BookOpen size={20} />}
          />
          <KpiCard
            title="Total Students"
            value={stats.totalStudents}
            trend={`${stats.studentsChange}%`}
            isPositive={stats.studentsChange >= 0}
            icon={<Users size={20} />}
          />

          <KpiCard
            title="Average Rating"
            value={stats.avgRating}
            trend="4.8 Target"
            isPositive={stats.avgRating >= 4}
            icon={<Star size={20} />}
          />
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* ENGAGEMENT TRENDS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-[380px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-base">Engagement Trends</h3>
                <span className="text-xs text-indigo-600">Student Activity</span>
              </div>

              <div className="flex-1 border border-dashed border-slate-200 rounded-md flex items-center justify-center text-slate-400 text-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <Line dataKey="students" stroke="#6366f1" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-base mb-6">Quick Actions</h3>

              <div className="space-y-4">
                <ActionButton
                  icon={<Plus size={18} />}
                  title="Create New Course"
                  description="Start building content"
                  onClick={() => navigate("/instructor/add-course")}
                  color="indigo"
                />
                <ActionButton
                  icon={<Folder size={18} />}
                  title="Manage Courses"
                  description="View and edit library"
                  onClick={() => navigate("/instructor/courses")}
                  color="amber"
                />
                <ActionButton
                  icon={<MessageSquare size={18} />}
                  title="Message Students"
                  description="Broadcast announcements"
                  onClick={() => navigate("/instructor/chat")}
                  color="emerald"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* DOWNLOAD ANALYTICS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                    Download Analytics
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Export performance data by date.
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 p-4">
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
              </div>
              <button
                onClick={handleDownload}
                className="w-full mt-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold"
              >
                Download Report
              </button>

              {/* CURRENT RANGE SUMMARY */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                  Current Range Summary
                </h3>
                
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <span className="text-sm text-slate-600">My Courses:</span>
                    <span className="text-sm font-semibold text-slate-900">{stats.myCourses}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Total Students:</span>
                    <span className="text-sm font-semibold text-slate-900">{stats.totalStudents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Avg Rating:</span>
                    <span className="text-sm font-semibold text-slate-900">{stats.avgRating}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STUDENT PERFORMANCE MATRIX */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center px-6 py-4 border-b">
            <h3 className="font-semibold text-base">
              Student Performance Matrix
            </h3>
            <div className="relative w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter students..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8fafc] border-b">
                <tr>
                  {[
                    "Student Name",
                    "Course",
                    "Progress",
                    "Avg. Score",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="text-center py-14 text-slate-400">
                    No student data available
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboardView;

/* ---------- SUB COMPONENTS ---------- */

const KpiCard = ({ title, value, trend, isPositive, icon }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-[140px] flex flex-col justify-between">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">
          {title}
        </p>
        <h3 className="text-3xl font-semibold mt-1 text-slate-900">
          {value}
        </h3>
      </div>
      <div className="text-slate-300">{icon}</div>
    </div>
    <div className="flex items-center gap-1.5 text-sm mt-3">
      {isPositive ? (
        <ArrowUpRight size={16} className="text-emerald-600" />
      ) : (
        <ArrowDownRight size={16} className="text-rose-600" />
      )}
      <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
        {trend}
      </span>
    </div>
  </div>
);

const ActionButton = ({ icon, title, description, onClick, color }) => {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:shadow-sm transition"
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}
      >
        {icon}
      </div>
      <div className="text-left">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
    </button>
  );
};
