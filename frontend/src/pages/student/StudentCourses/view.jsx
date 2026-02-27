/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { BookOpen, Search, Filter, ArrowRight, Library, Star, Check } from "lucide-react";
import ReviewModal from "../../../components/student/ReviewModal";

const StudentCoursesView = ({
  loading,
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedLevel,
  setSelectedLevel,
  displayCourses,
  enrolledIds,
  categories,
  handleEnroll,
  navigate,
  isFreeOnly, // NEW
  setIsFreeOnly, // NEW
  learningPaths, // Learning path search results
  allLearningPaths, // All learning paths for tab
}) => {
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    courseId: null,
    courseTitle: "",
    instructorId: null,
    instructorName: "",
  });

  const openReviewModal = (e, course) => {
    e.stopPropagation();
    // Ensure we have course_id and instructor_id
    if (!course.instructor_id) {
      console.warn("No instructor_id found for course", course);
      return;
    }
    if (!course.courses_id && !course.id) {
      console.warn("No course_id found for course", course);
      return;
    }
    setReviewModal({
      isOpen: true,
      courseId: course.courses_id || course.id,
      courseTitle: course.title || "Course",
      instructorId: course.instructor_id,
      instructorName: course.instructor_name || "Instructor",
    });
  };
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">
            Loading catalog...
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-8 font-sans text-primary-900">
      <ReviewModal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal({ ...reviewModal, isOpen: false })}
        courseId={reviewModal.courseId}
        courseTitle={reviewModal.courseTitle}
        instructorId={reviewModal.instructorId}
        instructorName={reviewModal.instructorName}
      />
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-900 tracking-tight">
            Course Library
          </h1>
          <div className="flex gap-6 mt-4 flex-wrap">
            <button
              className={`pb-2 text-sm font-bold transition-all relative ${activeTab === "my-learning"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
                }`}
              onClick={() => setActiveTab("my-learning")}
            >
              My Learning
            </button>
            <button
              className={`pb-2 text-sm font-bold transition-all relative ${activeTab === "explore"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
                }`}
              onClick={() => setActiveTab("explore")}
            >
              Explore Catalog
            </button>
            <button
              className={`pb-2 text-sm font-bold transition-all relative ${activeTab === "free-courses"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
                }`}
              onClick={() => setActiveTab("free-courses")}
            >
              Free Courses
            </button>
            <button
              className={`pb-2 text-sm font-bold transition-all relative ${activeTab === "paid-courses"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
                }`}
              onClick={() => setActiveTab("paid-courses")}
            >
              Paid Courses
            </button>
            <button
              className={`pb-2 text-sm font-bold transition-all relative ${activeTab === "recommended"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
                }`}
              onClick={() => setActiveTab("recommended")}
            >
              Recommended
            </button>
            <button
              className={`pb-2 text-sm font-bold transition-all relative ${activeTab === "upcoming"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
                }`}
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={`pb-2 text-sm font-bold transition-all relative ${activeTab === "learning-paths"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
                }`}
              onClick={() => setActiveTab("learning-paths")}
            >
              Learning Paths
            </button>
          </div>
        </div>
      </div>
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-0 outline-none transition-all text-sm font-medium"
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-3 py-2 rounded-md hover:border-indigo-500 transition-colors h-[38px] select-none">
            <input
              type="checkbox"
              checked={isFreeOnly}
              onChange={(e) => setIsFreeOnly(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-0 w-4 h-4"
            />
            <span className="text-sm font-medium text-slate-700">
              Free Only
            </span>
          </label>

          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
            <select
              className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 focus:border-indigo-500 outline-none cursor-pointer appearance-none min-w-[160px]"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <select
            className="px-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 focus:border-indigo-500 outline-none cursor-pointer"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            <option value="All">All Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Learning Paths Tab Content */}
      {activeTab === "learning-paths" && (
        <div className="space-y-6">
          {(!allLearningPaths || allLearningPaths.length === 0) ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-16 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-300 border border-indigo-100">
                <Library size={32} />
              </div>
              <h3 className="text-base font-bold text-primary-900 mb-1">
                No learning paths available
              </h3>
              <p className="text-sm text-slate-500">
                Learning paths will appear here when instructors create them.
              </p>
            </div>
          ) : (
            allLearningPaths.map((lp) => (
              <div key={lp.id} className="bg-gradient-to-r from-indigo-50 via-white to-purple-50 border border-indigo-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">🛤️</span>
                  <h3 className="text-lg font-bold text-indigo-900">
                    {lp.name}
                  </h3>
                </div>
                {lp.description && (
                  <p className="text-sm text-slate-500 mb-4 ml-10">{lp.description}</p>
                )}
                <div className="text-xs text-indigo-600 font-semibold mb-4 ml-10">
                  {lp.courses.length} course{lp.courses.length !== 1 ? "s" : ""} in this path
                </div>

                <div className="space-y-3 ml-4">
                  {lp.courses.map((course, idx) => {
                    const enrolled = course.is_enrolled;
                    return (
                      <div
                        key={course.courses_id}
                        className="flex items-center gap-4 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all p-4 group"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow">
                          {course.order_index}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-primary-900 group-hover:text-indigo-600 transition-colors truncate">
                              {course.title}
                            </h4>
                            <span className="flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                              {course.difficulty || "General"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-500">{course.category}</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">By {course.instructor_name || "Instructor"}</span>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${course.price_type === "paid" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                              }`}>
                              {course.price_type === "paid" ? `₹${course.price_amount}` : "FREE"}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {course.is_completed ? (
                            <span className="px-4 py-2 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-md flex items-center gap-1.5">
                              <Check size={12} /> Completed
                            </span>
                          ) : enrolled ? (
                            <button
                              className="px-4 py-2 bg-primary-900 hover:bg-slate-800 text-white font-bold text-xs rounded-md transition-colors flex items-center gap-1.5"
                              onClick={() => navigate(`/student/course/${course.courses_id}`)}
                            >
                              Resume <ArrowRight size={12} />
                            </button>
                          ) : (
                            <button
                              className="px-4 py-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold text-xs rounded-md transition-colors"
                              onClick={() => handleEnroll(course.courses_id)}
                            >
                              Enroll
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Learning Path Search Results (for other tabs) */}
      {activeTab !== "learning-paths" && learningPaths && learningPaths.length > 0 && (
        <div className="space-y-6 mb-8">
          {learningPaths.map((lp) => (
            <div key={lp.id} className="bg-gradient-to-r from-indigo-50 via-white to-purple-50 border border-indigo-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">🛤️</span>
                <h3 className="text-lg font-bold text-indigo-900">
                  Learning Path: {lp.name}
                </h3>
              </div>
              {lp.description && (
                <p className="text-sm text-slate-500 mb-4 ml-10">{lp.description}</p>
              )}
              <div className="text-xs text-indigo-600 font-semibold mb-4 ml-10">
                {lp.courses.length} course{lp.courses.length !== 1 ? "s" : ""} in this path
              </div>

              {/* Ordered course cards */}
              <div className="space-y-3 ml-4">
                {lp.courses.map((course, idx) => {
                  const enrolled = course.is_enrolled;
                  return (
                    <div
                      key={course.courses_id}
                      className="flex items-center gap-4 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all p-4 group"
                    >
                      {/* Step number */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow">
                        {course.order_index}
                      </div>

                      {/* Connector line */}
                      {idx < lp.courses.length - 1 && (
                        <div className="absolute left-9 top-14 w-0.5 h-6 bg-indigo-200" />
                      )}

                      {/* Course info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-primary-900 group-hover:text-indigo-600 transition-colors truncate">
                            {course.title}
                          </h4>
                          <span className="flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                            {course.difficulty || "General"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">
                            {course.category}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">
                            By {course.instructor_name || "Instructor"}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${course.price_type === "paid"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                            }`}>
                            {course.price_type === "paid" ? `₹${course.price_amount}` : "FREE"}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex-shrink-0">
                        {course.is_completed ? (
                          <span className="px-4 py-2 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-md flex items-center gap-1.5">
                            <Check size={12} /> Completed
                          </span>
                        ) : enrolled ? (
                          <button
                            className="px-4 py-2 bg-primary-900 hover:bg-slate-800 text-white font-bold text-xs rounded-md transition-colors flex items-center gap-1.5"
                            onClick={() => navigate(`/student/course/${course.courses_id}`)}
                          >
                            Resume <ArrowRight size={12} />
                          </button>
                        ) : (
                          <button
                            className="px-4 py-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold text-xs rounded-md transition-colors"
                            onClick={() => handleEnroll(course.courses_id)}
                          >
                            Enroll
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {displayCourses.length === 0 && (!learningPaths || learningPaths.length === 0) && activeTab !== "learning-paths" ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-16 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 border border-slate-200">
            <Library size={32} />
          </div>
          <h3 className="text-base font-bold text-primary-900 mb-1">
            No courses found
          </h3>
          <p className="text-sm text-slate-500">
            Try adjusting your filters or search terms.
          </p>
        </div>
      ) : displayCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayCourses.map((courses) => {
            const isEnrolled = enrolledIds.includes(courses.courses_id);
            return (
              <div
                key={courses.courses_id}
                className="bg-white rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col h-full group"
              >
                {/* Thumbnail (Placeholder) */}
                <div className="h-40 bg-slate-100 border-b border-slate-100 p-6 flex items-center justify-center relative overflow-hidden group-hover:bg-slate-50 transition-colors">
                  <BookOpen
                    className="text-slate-300 w-16 h-16 group-hover:text-indigo-200 transition-colors"
                    strokeWidth={1}
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-800">
                    {courses.category}
                  </div>
                  <div className="absolute top-3 right-3 bg-slate-800 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                    {courses.difficulty || "General"}
                  </div>
                  <div
                    className={`absolute bottom-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm ${courses.price_type
                      ? "bg-amber-400 text-slate-900 border border-amber-500"
                      : "bg-emerald-500 text-white border border-emerald-600"
                      }`}
                  >
                    {courses.price_type === "paid"
                      ? `₹${courses.price_amount}`
                      : "FREE"}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <h4 className="text-base font-bold text-primary-900 mb-2 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                    {courses.title}
                  </h4>
                  <p className="text-xs text-slate-600 mb-4 font-bold flex items-center gap-1">
                    By{" "}
                    <span className="text-slate-800">
                      {courses.instructor_name || "Instructor"}
                    </span>
                  </p>

                  <div className="mt-auto pt-4 border-t border-slate-100">
                    {isEnrolled ? (
                      <>
                        <button
                          className="w-full bg-primary-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded text-sm transition-colors flex items-center justify-center gap-2"
                          onClick={() =>
                            navigate(`/student/course/${courses.courses_id}`)
                          }
                        >
                          Resume <ArrowRight size={14} />
                        </button>
                        <button
                          className={`w-full font-bold py-2 px-4 rounded text-sm transition-colors flex items-center justify-center gap-2 ${courses.has_reviewed
                            ? "bg-green-50 text-green-700 border border-green-200 cursor-not-allowed"
                            : "bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-600"
                            }`}
                          onClick={(e) =>
                            !courses.has_reviewed && openReviewModal(e, courses)
                          }
                          disabled={courses.has_reviewed}
                        >
                          {courses.has_reviewed ? (
                            <>
                              <Check size={14} /> Rating Submitted
                            </>
                          ) : (
                            <>
                              <Star size={14} /> Rate Instructor
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        className="w-full bg-white border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 font-bold py-2 px-4 rounded text-sm transition-all flex items-center justify-center gap-2"
                        onClick={() => handleEnroll(courses.courses_id)}
                      >
                        Enroll Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default StudentCoursesView;