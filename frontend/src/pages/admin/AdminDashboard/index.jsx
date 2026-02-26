import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../auth/firebase";
import api from "../../../api/axios";
import AdminDashboardView from "./view";
import DateRangeFilter from "../../../components/DateRangeFilter";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingCourses: 0,
    totalInstructors: 0,
  });
  const [error, setError] = useState("");

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const debounceTimer = useRef(null);

  /* =========================
     FETCH DASHBOARD STATS
  ========================= */
  useEffect(() => {
    fetchStats(dateRange);
  }, [dateRange]);

  const fetchStats = async (range) => {
    try {
      setLoading(true);

      if (!auth.currentUser) {
        throw new Error("Not authenticated");
      }

      const token = await auth.currentUser.getIdToken();

      const res = await api.get("/api/admin/dashboard-stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: range || {},
      });

      setStats(res.data);
    } catch (err) {
      console.error("Error fetching admin stats:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    try {
      if (!auth.currentUser) {
        throw new Error("Not authenticated");
      }

      const token = await auth.currentUser.getIdToken();

      const res = await api.get("/api/admin/search-courses", {
        params: { query },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSearchResults(res.data || []);
      
    } catch (err) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = useCallback((query) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    // Set new timer for debounced search (300ms delay)
    debounceTimer.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);
  /* =========================
     NAVIGATION HANDLERS
  ========================= */
  const goToAddInstructor = () => navigate("/admin/add-instructor");
  const goToApproveCourses = () => navigate("/admin/approve-courses");
  const goToAssignCourse = () => navigate("/admin/assign-course");

  return (
    <AdminDashboardView
      loading={loading}
      error={error}
      stats={stats}
      chartData={[]} // Add your actual chart data here if you have it
      onSearch={handleSearch}
      searchResults={searchResults}
      searchLoading={searchLoading}
      goToAddInstructor={goToAddInstructor}
      goToApproveCourses={goToApproveCourses}
      goToAssignCourse={goToAssignCourse}
      dateRange={dateRange}
      setDateRange={setDateRange}
    />
  );
};

export default AdminDashboard;
