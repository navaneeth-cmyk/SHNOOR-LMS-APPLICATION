import { useEffect, useState } from "react";
import CertificateConfigView from "./view";

const CertificateConfig = () => {
  const [config, setConfig] = useState({
    templateUrl: "",
    signatureUrl: "",
    authorityName: "Director of Education",
    issuerName: "Shnoor LMS",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================
     FETCH CONFIG
  ========================= */
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);

      // ⛳ TEMP MOCK (replace with real API later)
      setTimeout(() => {
        setConfig({
          templateUrl: "https://example.com/cert-template.png",
          signatureUrl: "https://example.com/signature.png",
          authorityName: "Director of Education",
          issuerName: "Shnoor LMS",
        });
        setLoading(false);
      }, 800);

      // ✅ FUTURE REAL API
      // const res = await api.get("/api/admin/certificates/config");
      // setConfig(res.data);

    } catch (err) {
      console.error("Error fetching certificate config:", err);
      setError("Failed to load certificate configuration");
      setLoading(false);
    }
  };

  /* =========================
     UPDATE FIELDS
  ========================= */
  const updateField = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /* =========================
     SAVE CONFIG
  ========================= */
  const handleSave = async () => {
    try {
      // ⛳ TEMP MOCK
      alert("Certificate configuration saved successfully!");

      // ✅ FUTURE REAL API
      // await api.post("/api/admin/certificates/config", config);

    } catch (err) {
      console.error("Error saving config:", err);
      throw err;
    }
  };

  return (
    <CertificateConfigView
      loading={loading}
      error={error}
      config={config}
      updateField={updateField}
      handleSave={handleSave}
    />
  );
};

export default CertificateConfig;
