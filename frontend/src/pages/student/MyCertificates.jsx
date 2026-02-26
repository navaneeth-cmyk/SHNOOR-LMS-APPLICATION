import { FaTrophy, FaPrint } from "react-icons/fa";
import React, { useState, useEffect } from "react";
import "../../styles/Dashboard.css";
import api from "../../api/axios";

/* ================= GENERATE CERTIFICATE ================= */
const generateCertificateAPI = async (exam_name, percentage) => {
  try {
    const res = await api.post("/api/certificate/generate", {
      exam_name,
      percentage
    });

    return res.data?.success
      ? { generated: true }
      : { generated: false };

  } catch (err) {
    console.error("Certificate API Error:", err.response?.data || err);
    return { generated: false };
  }
};

const MyCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState(null);

  /* ================= FETCH CERTIFICATES ================= */
  const fetchCertificates = async () => {
    try {
      const res = await api.get("/api/certificate/my");

      const formatted = res.data.map((c) => ({
        id: c.id,
        course: c.exam_name,
        date: new Date(c.issued_at).toLocaleDateString(),
        score: c.score
      }));

      setCertificates(formatted);
    } catch (err) {
      console.error("Fetch certificates error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  /* ================= GENERATE ================= */
  const handleGenerateCertificate = async (cert) => {
    const result = await generateCertificateAPI(cert.course, cert.score);

    if (result.generated) {
      alert("Certificate generated successfully!");
      fetchCertificates();
    } else {
      alert("Certificate already exists or not eligible.");
    }
  };

  /* ================= PRINT ================= */
  const handlePrint = () => window.print();

  if (loading) return <div className="p-8">Loading certificates...</div>;

  /* ================= CERTIFICATE VIEW ================= */
  if (selectedCert) {
    return (
      <div className="certificate-view-container">
        <div className="no-print">
          <button onClick={() => setSelectedCert(null)}>Back</button>
          <button onClick={handlePrint}>
            <FaPrint /> Print
          </button>
        </div>

        <div className="certificate-paper">
          <h1>Certificate of Achievement</h1>
          <h2>{localStorage.getItem("full_name") || "Student Name"}</h2>
          <p className="certificate-subtitle">has successfully completed</p>
          <h3>{selectedCert.course}</h3>
          <p className="certificate-score">
            Score: {selectedCert.score}%
          </p>
          <p className="certificate-date">
            Date: {selectedCert.date}
          </p>
        </div>
      </div>
    );
  }

  /* ================= DASHBOARD ================= */
  return (
    <div>
      <div className="student-page-header">
        <h3>My Certificates</h3>
        <div>
          <FaTrophy /> 0 XP
        </div>
      </div>

      {certificates.length === 0 ? (
        <p>No certificates found</p>
      ) : (
        certificates.map((cert) => (
          <div key={cert.id} className="certificate-item">
            <h4>{cert.course}</h4>
            <p>Date: {cert.date}</p>
            <p>Score: {cert.score}%</p>

            <button onClick={() => setSelectedCert(cert)}>View</button>
            <button onClick={() => handleGenerateCertificate(cert)}>
              Generate PDF
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default MyCertificates;
