import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../auth/firebase";
import api from "../../../api/axios";
import CourseListView from "./view";

export const CourseList = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================
     FETCH COURSES
  ========================= */
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        if (!auth.currentUser) return;

        const token = await auth.currentUser.getIdToken();
        const res = await api.get("/api/courses/instructor", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setCourses(res.data);
      } catch (err) {
        console.error("Failed to load courses", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  /* =========================
     COURSE ACTIONS
  ========================= */
  const openCourse = (course) => {
    setSelectedCourse(course);
  };

  const backToList = () => {
    setSelectedCourse(null);
  };

  const editCourse = (course) => {
    navigate(`/instructor/add-course?edit=${course.courses_id}`, {
      state: { courseData: course },
    });
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm("Delete this course?")) return;

    try {
      const token = await auth.currentUser.getIdToken();
      await api.delete(`/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCourses((prev) =>
        prev.filter((c) => c.courses_id !== courseId)
      );

      if (selectedCourse?.courses_id === courseId) {
        setSelectedCourse(null);
      }
    } catch (err) {
      console.error("Failed to delete course", err);
      alert("Failed to delete course");
    }
  };

  const archiveCourse = async (courseId) => {
    if (!window.confirm("Archive this course?")) return;

    try {
      const token = await auth.currentUser.getIdToken();
      await api.patch(
        `/api/courses/${courseId}/archive`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setCourses((prev) =>
        prev.map((c) =>
          c.courses_id === courseId ? { ...c, status: "archived" } : c
        )
      );
    } catch (err) {
      console.error("Failed to archive course", err);
      alert("Failed to archive course");
    }
  };

  const unarchiveCourse = async (courseId) => {
    if (!window.confirm("Unarchive this course?")) return;

    try {
      const token = await auth.currentUser.getIdToken();
      await api.patch(
        `/api/courses/${courseId}/unarchive`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setCourses((prev) =>
        prev.map((c) =>
          c.courses_id === courseId ? { ...c, status: "approved" } : c
        )
      );
    } catch (err) {
      console.error("Failed to unarchive course", err);
      alert("Failed to unarchive course");
    }
  };

  return (
    <CourseListView
      loading={loading}
      courses={courses}
      selectedCourse={selectedCourse}
      onOpenCourse={openCourse}
      onBack={backToList}
      onEdit={editCourse}
      onDelete={deleteCourse}
      onArchive={archiveCourse}
      onUnarchive={unarchiveCourse}
      onCreate={() => navigate("/instructor/add-course")}
    />
  );
};
export default CourseList;
