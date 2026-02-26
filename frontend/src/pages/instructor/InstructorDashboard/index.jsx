import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../../auth/firebase';
import api from '../../../api/axios';
import InstructorDashboardView from './view';

export const InstructorDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        myCourses: 0,
        totalStudents: 0,
        avgRating: 0,
        coursesChange: 0,
      studentsChange: 0
    });
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('Instructor');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [dateRange, setDateRange] = useState(null);
    const debounceTimer = useRef(null);

  // ==========================================
  // Fetch stats when dateRange changes
  // ==========================================
  useEffect(() => {
    fetchDashboardStats(dateRange);
  }, [dateRange]);

  const fetchDashboardStats = async (range) => {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken(true);

      const params = range ? {
        startDate: range.startDate,
        endDate: range.endDate
      } : {};

      const [courseRes, studentRes] = await Promise.all([
        api.get("/api/courses/instructor/stats", {
          headers: { Authorization: `Bearer ${token}` },
          params
        }),
        api.get("/api/assignments/instructor/students/count", {
          headers: { Authorization: `Bearer ${token}` },
          params
        }),
      ]);

      setStats({
        myCourses: Number(courseRes.data.total_courses),
        totalStudents: Number(studentRes.data.total_students),
        avgRating: courseRes.data.avg_rating || 4.8,
        coursesChange: courseRes.data.coursesChange || 0,
        studentsChange: studentRes.data.studentsChange || 0
      });
    } catch (err) {
      console.error("Dashboard stats error:", err);
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

            const res = await api.get("/api/courses/instructor/search", {
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
    return (
        <InstructorDashboardView
            loading={loading}
            userName={userName}
            stats={stats}
            searchResults={searchResults}
            searchLoading={searchLoading}
            onSearch={handleSearch}
            navigate={navigate}
            dateRange={dateRange}
            setDateRange={setDateRange}
        />
    );
};

export default InstructorDashboard;
