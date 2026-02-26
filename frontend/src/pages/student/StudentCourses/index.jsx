import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../auth/firebase";
import api from "../../../api/axios";
import StudentCoursesView from "./view";

const StudentCourses = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("my-learning");
  const [myCourses, setMyCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingCourses, setUpcomingCourses] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [isFreeOnly, setIsFreeOnly] = useState(false); // NEW
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // 🔑 derive enrolledIds for the VIEW
  const enrolledIds = myCourses.map((c) => c.courses_id || c.id);

  // Filter upcoming courses (scheduled for future)
  useEffect(() => {
    const now = new Date();
    const upcoming = allCourses.filter((course) => {
      if (!course.schedule_start_at) return false;
      return new Date(course.schedule_start_at) > now;
    });
    setUpcomingCourses(upcoming);
  }, [allCourses]);

  // Fetch courses (My Learning + Explore)
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        if (!auth.currentUser) return;

        setLoading(true);
        const token = await auth.currentUser.getIdToken(true);

        const [myRes, exploreRes] = await Promise.all([
          api.get("/api/student/my-courses", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/api/courses/explore", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setMyCourses(myRes.data || []);
        setAllCourses(exploreRes.data || []);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setSearchLoading(true);
        const token = await auth.currentUser.getIdToken(true);
        const res = await api.get("/api/student/search-courses", {
          params: { query: searchTerm },
          headers: { Authorization: `Bearer ${token}` },
        });
        setSearchResults(res.data || []);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    performSearch();
  }, [searchTerm]);

  const getDisplayCourses = () => {
    switch (activeTab) {
      case "my-learning":
        return myCourses;

      case "explore":
        return allCourses;

      case "free-courses":
        return allCourses.filter((c) => c.price_type === "free");

      case "paid-courses":
        return allCourses.filter((c) => c.price_type === "paid");

      case "recommended":
        const userCategories = myCourses.map((c) => c.category);
        return allCourses.filter(
          (c) =>
            userCategories.includes(c.category) &&
            !enrolledIds.includes(c.courses_id || c.id),
        );

      case "upcoming":
        return upcomingCourses;

      default:
        return allCourses;
    }
  };

  // Pick active list
  const displayCourses = getDisplayCourses();

  // Apply filters
  const filteredCourses = displayCourses.filter((course) => {
    const matchesSearch = course.title
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || course.category === selectedCategory;

    const matchesLevel =
      selectedLevel === "All" || course.difficulty === selectedLevel;

    const matchesPrice = isFreeOnly ? course.price_type === "free" : true;

    return matchesSearch && matchesCategory && matchesLevel && matchesPrice;
  });

  // Enroll handler
  const handleEnroll = async (courseId) => {
    try {
      const token = await auth.currentUser.getIdToken(true);

      const res = await api.post(
        `/api/student/${courseId}/enroll`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // ✅ FREE course → enrolled
      if (res.data?.success) {
        const [myRes, exploreRes] = await Promise.all([
          api.get("/api/student/my-courses", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/api/courses/explore", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setMyCourses(myRes.data || []);
        setAllCourses(exploreRes.data || []);
        setActiveTab("my-learning");
      }
    } catch (err) {
      // ✅ PAID course → redirect
      if (
        err.response?.status === 402 &&
        err.response?.data?.redirectToPayment
      ) {
        // TEMP redirect for testing
        window.location.href = "https://stripe.com/in";
        return;
      }

      console.error("Enroll failed:", err);
      alert(err.response?.data?.message || "Failed to enroll.");
    }
  };

  // Categories for filter dropdown
  const categories = [
    ...new Set(allCourses.map((c) => c.category).filter(Boolean)),
  ];

  return (
    <StudentCoursesView
      loading={loading}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      selectedLevel={selectedLevel}
      setSelectedLevel={setSelectedLevel}
      displayCourses={filteredCourses}
      enrolledIds={enrolledIds}
      categories={categories}
      handleEnroll={handleEnroll}
      navigate={navigate}
      isFreeOnly={isFreeOnly} // NEW
      setIsFreeOnly={setIsFreeOnly} // NEW
      searchLoading={searchLoading}
    />
  );
};

export default StudentCourses;
