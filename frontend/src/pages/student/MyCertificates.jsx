import { FaDownload, FaTrophy, FaCertificate, FaMedal, FaCalendarAlt, FaChartBar, FaEye } from "react-icons/fa";
import { QRCodeSVG } from "qrcode.react";
import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import {
  addLocalCertificate,
  claimAnonymousCertificates,
  getLocalCertificates,
  normalizeCertificateCourseName,
} from "../../utils/certificateStorage";
import "../../styles/Dashboard.css";

// Generate certificate PDF via backend (optional)
const generateCertificateAPI = async (user_id, course, score) => {
  try {
    const res = await api.post("/api/certificate/add", {
      user_id,
      exam_name: normalizeCertificateCourseName(course),
      score,
    });
    if (res.data?.generated) {
      return {
        generated: true,
        certificateId: res.data?.data?.certificate_id || null,
      };
    }
    return { generated: false };
  } catch (err) {
    return { generated: false };
  }
};

// Merge backend certs with local, dedupe by course+date
function mergeCertificates(local, backendFormatted) {
  const keys = new Set(local.map((c) => `${c.course}|${c.date}`));
  const fromBackend = (backendFormatted || []).filter((c) => {
    const k = `${c.course}|${c.date}`;
    if (keys.has(k)) return false;
    keys.add(k);
    return true;
  });
  return [...local, ...fromBackend];
}

// ----------------------------------------------------------------------
// DEFAULT CONFIGURATION & LOCAL OVERRIDES (Frontend Only)
// ----------------------------------------------------------------------
const defaultConfig = {
  title: "Certificate of Achievement",
  authorityName: "Director of Education",
  issuerName: "Shnoor LMS", // Added default
  logoUrl: "/just_logo.svg",
  signatureUrl: "/signatures/sign.png",
  templateUrl: "", // Empty string means no background by default
};

// OPTIONAL: Override specific fields here locally without changing Firestore
// Example: { authorityName: "Chief Instructor" }
const localOverrides = {
  // authorityName: "Chief Instructor", 
};

const MyCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState(null);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [certConfig, setCertConfig] = useState(null);
  const [currentCertId, setCurrentCertId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchCertConfig = async () => {
      try {
        const res = await api.get("/api/certificate/settings/config");
        const firestoreData = res.data || {};

        const finalConfig = {
          ...defaultConfig,
          ...firestoreData,
          ...localOverrides,
          logoUrl: firestoreData.logoUrl || defaultConfig.logoUrl,
          signatureUrl: firestoreData.signatureUrl || firestoreData.imageUrl || defaultConfig.signatureUrl,
          authorityName: firestoreData.authorityName || defaultConfig.authorityName,
          title: firestoreData.title || defaultConfig.title,
        };

        setCertConfig(finalConfig);
      } catch (err) {
        console.error("Error fetching certificate configuration:", err);
        setCertConfig(defaultConfig); // Fallback to defaults
      }
    };

    fetchCertConfig();
  }, []);


  const loadCertificates = useCallback(async () => {
    let userId = localStorage.getItem("user_id");

    try {
      const meRes = await api.get("/api/auth/me", { timeout: 2000 });
      if (meRes.data?.user_id != null) {
        userId = String(meRes.data.user_id);
        localStorage.setItem("user_id", userId);
      }
      if (meRes.data?.full_name) {
        localStorage.setItem("full_name", meRes.data.full_name);
      }
    } catch (_) { }

    if (userId) {
      claimAnonymousCertificates(userId);
    }

    // 1) Always show local certificates first (no backend needed)
    const local = getLocalCertificates();
    setCertificates(local);
    setLoading(false);

    // 1b) Backfill local certificates from passed exams (for users who passed before local save existed)
    try {
      const examsRes = await api.get("/api/exams", { timeout: 2500 });
      const exams = Array.isArray(examsRes.data) ? examsRes.data : [];
      const passedExams = exams.filter((exam) => Boolean(exam?.passed));

      if (passedExams.length > 0) {
        passedExams.forEach((exam) => {
          addLocalCertificate({
            course: exam.title || exam.course_title || "Exam",
            score: Number(exam.percentage ?? 0),
          });
        });

        const refreshedLocal = getLocalCertificates();
        setCertificates(refreshedLocal);
      }
    } catch (_) {
      // Non-blocking: keep showing local/backend data if exams endpoint is unavailable
    }

    // 2) Optionally merge in backend certificates if server is available
    if (!userId) return;

    try {
      const res = await api.get(`/api/certificate/${userId}`);
      const data = res.data;
      if (res.status === 404 || (data?.message?.includes("not found"))) {
        setBackendUnavailable(false);
        return;
      }
      const certArray = Array.isArray(data) ? data : data ? [data] : [];
      const formatted = certArray.map((c) => ({
        id: c.id || c.certificate_id || String(Math.random()).slice(2, 11),
        course: normalizeCertificateCourseName(c.exam_name),
        date: c.issued_at ? new Date(c.issued_at).toLocaleDateString() : new Date().toLocaleDateString(),
        score: c.score,
        certificateId: c.certificate_id || null,
        previewColor: "#003366",
      }));
      setCertificates((prev) => mergeCertificates(prev, formatted));
      setBackendUnavailable(false);
    } catch (_) {
      setBackendUnavailable(true);
    }
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  useEffect(() => {
    if (!selectedCert) { setCurrentCertId(""); return; }
    if (selectedCert.certificateId) {
      setCurrentCertId(String(selectedCert.certificateId));
      return;
    }

    setCurrentCertId("");
  }, [selectedCert]);

  // ================= GENERATE CERTIFICATE (PDF via backend, optional) =================
  const handleGenerateCertificate = async (cert) => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      setSelectedCert(cert);
      return;
    }

    setIsGenerating(true);
    const result = await generateCertificateAPI(userId, cert.course, cert.score || 90);
    setIsGenerating(false);

    const updatedCert = result.generated && result.certificateId
      ? { ...cert, certificateId: result.certificateId }
      : cert;

    if (result.generated && result.certificateId) {
      setCertificates((prev) =>
        prev.map((item) =>
          item.id === cert.id ? { ...item, certificateId: result.certificateId } : item
        )
      );
    }

    setSelectedCert(updatedCert);
  };

  // ================= PRINT =================
  const handleDownloadCertificate = async () => {
    if (!currentCertId) {
      alert("Certificate file is not ready yet. Please generate certificate first.");
      return;
    }

    try {
      setIsGenerating(true);
      const response = await api.get(
        `/api/certificate/download/${encodeURIComponent(currentCertId)}`,
        { responseType: "blob" }
      );

      const contentType = response.headers?.["content-type"] || "";
      const blob = response.data;

      if (!contentType.includes("application/pdf")) {
        let serverMessage = "Failed to download certificate PDF from server.";
        try {
          const text = await blob.text();
          if (text) {
            const parsed = JSON.parse(text);
            serverMessage = parsed?.message || parsed?.error || serverMessage;
          }
        } catch (_) {}
        throw new Error(serverMessage);
      }

      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      if (pdfBlob.size < 1024) {
        throw new Error("Downloaded file is incomplete.");
      }

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      const safeName = (selectedCert?.course || "certificate").replace(/[^a-z0-9_\- ]/gi, "");
      link.href = url;
      link.download = `Certificate_${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Certificate download failed:", error);
      let message = "Failed to download certificate PDF from server.";

      try {
        if (error?.response?.data instanceof Blob) {
          const text = await error.response.data.text();
          if (text) {
            try {
              const parsed = JSON.parse(text);
              message = parsed?.message || parsed?.error || text || message;
            } catch {
              message = text;
            }
          }
        } else if (error?.response?.data?.message) {
          message = error.response.data.message;
        } else if (error?.message) {
          message = error.message;
        }
      } catch (_) {
        message = error?.message || message;
      }

      alert(message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return <div className="p-8">Loading certificates…</div>;

  // ================= CERTIFICATE VIEW =================
  if (selectedCert) {
    return (
      <div className="certificate-view-container">
        <div className="certificate-actions no-print">
          <button className="back-btn" onClick={() => setSelectedCert(null)}>Back to My Certificates</button>
          <button
            className="download-pdf-btn"
            onClick={handleDownloadCertificate}
            disabled={isGenerating}
          >
            <FaDownload /> {isGenerating ? "Generating..." : "Download PDF"}
          </button>
        </div>

        {/*<div className="certificate-paper">start
          <img
            src="/just_logo.svg"
            alt="Company Logo"
            className="certificate-logo"
          />
          <h1>Certificate Of Achievement</h1>
          <h2>{localStorage.getItem("full_name") || "Student Name"}</h2>
          <p className="certificate-subtitle">has successfully completed</p>
          <h3>{selectedCert.course}</h3>
          <p className="certificate-score">Score: {selectedCert.score || selectedCert.score === 0 ? `${selectedCert.score}%` : 'Score not available'}</p>
          <p className="certificate-date">Date: {selectedCert.date}</p>
          <div className="certificate-signature-section">
  <div className="signature-box">
    <img
      src="/signatures/sign.png"
      alt="Authorized Signature"
      className="signature-img"
    />
    <p>Authorized Signatory</p>
  </div>
</div>
        </div> endnow*/}
        <div className="certificate-paper" id="certificate-to-print">
          {/* Triangle accents */}
          <div className="triangle top-left"></div>
          <div className="triangle top-right"></div>
          <div className="triangle bottom-left"></div>
          <div className="triangle bottom-right"></div>
          {/* 1. Centered Logo */}
          {certConfig?.logoUrl ? (
            <img src={certConfig.logoUrl} alt="Company Logo" className="certificate-logo" />
          ) : (
            <img src="/just_logo.svg" alt="Company Logo" className="certificate-logo" />
          )}

          {/* 2. Professional Title */}
          <h1>{certConfig?.title || "CERTIFICATE OF COMPLETION"}</h1>

          {/* 3. Intro Text */}
          <p className="this-is-to-certify">This is to certify that</p>

          {/* 4. Student Name (Bold & Centered) */}
          <h2 className="student-name-bold">{localStorage.getItem("full_name") || "Student Name"}</h2>

          {/* 5. Completion Statement */}
          <p className="program-completion-text">
            has successfully completed the training program with
          </p>
          <p className="company-name-highlight">
            {certConfig?.issuerName || "SHNOOR International LLC"}
          </p>

          {/* 6. Issued Date */}
          <p className="issued-on-date">Issued on: {selectedCert.date}</p>

          {/* 7. Authorized Signature */}
          <div className="signature-section">
            {certConfig?.signatureUrl ? (
              <img src={certConfig.signatureUrl} alt="Signature" className="signature-image" rotate="0" />
            ) : (
              <img src="/signatures/sign.png" alt="Signature" className="signature-image" rotate="0" />
            )}
            <p className="signature-label">Authorized Signature</p>
            <p className="authority-name-text" style={{ fontSize: '10px', marginTop: '2px', color: '#64748b' }}>
              {certConfig?.authorityName || "Director of Education"}
            </p>
          </div>

          {/* 8. NASSCOM Footer Logo */}
          <div className="nasscom-footer">
            <img src="/nasscom.jpg" alt="NASSCOM logo" className="nasscom-footer-logo" />
            <p className="nasscom-certified-text">Certified Member</p>
          </div>

          {/* Hidden QR and ID from "Front View" as requested */}
          <div className="qr-id-overlay">
            {currentCertId && (
              <QRCodeSVG
                value={`${window.location.origin}/verify/${currentCertId}`}
                size={40}
              />
            )}
            <span>ID: {currentCertId}</span>
          </div>
        </div>

      </div>
    );
  }

  // ================= DASHBOARD =================
  return (
    <div className="w-full pb-12 space-y-6">
      {/* HEADER */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 lg:p-8"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)' }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <FaMedal size={24} className="text-amber-300" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">My Certificates</h1>
              <p className="text-slate-400 text-sm mt-0.5">Your earned achievements and credentials.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2">
            <FaTrophy className="text-amber-300" size={16} />
            <span className="text-white font-bold text-sm">{certificates.length} Earned</span>
          </div>
        </div>
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
      </div>

      {backendUnavailable && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium">
          Showing locally saved certificates. Start the server to sync more.
        </div>
      )}

      {certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-100 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
            <FaMedal className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Certificates Yet</h3>
          <p className="text-sm text-slate-400">Complete exams to earn certificates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:border-indigo-200 hover:shadow-md transition-all duration-300 group"
            >
              {/* Certificate thumbnail */}
              <div
                className="h-36 flex flex-col items-center justify-center relative"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #312e81 100%)' }}
              >
                <FaMedal className="text-amber-400/60 group-hover:text-amber-400/90 transition-colors" size={52} />
                {cert.certificateId && (
                  <span className="absolute bottom-2 right-3 text-[10px] font-mono text-slate-400/70">
                    {cert.certificateId}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <h4 className="text-sm font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                  {cert.course}
                </h4>

                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400 mb-5">
                  <div className="flex items-center gap-1.5">
                    <FaCalendarAlt size={11} className="text-slate-400" />
                    {cert.date}
                  </div>
                  {cert.score != null && (
                    <div className="flex items-center gap-1.5">
                      <FaChartBar size={11} className="text-emerald-500" />
                      <span className="font-bold text-slate-600">{cert.score}%</span>
                    </div>
                  )}
                </div>

                <button
                  className="mt-auto w-full text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-xl active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' }}
                  onClick={() => handleGenerateCertificate(cert)}
                >
                  <FaEye size={13} /> View Certificate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCertificates;