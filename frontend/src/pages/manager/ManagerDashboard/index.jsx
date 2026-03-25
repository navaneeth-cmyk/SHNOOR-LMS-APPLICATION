import { useEffect, useState } from "react";
import api from "../../../api/axios";
import ManagerDashboardView from "./view";

const ManagerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    fullName: "Manager",
    email: "",
    college: "",
    bio: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/users/me");
        setProfile({
          fullName: res.data.displayName || "Manager",
          email: res.data.email || "",
          college: res.data.college || "",
          bio: res.data.bio || "",
        });
      } catch (error) {
        console.error("Failed to fetch manager profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return <ManagerDashboardView loading={loading} profile={profile} />;
};

export default ManagerDashboard;
