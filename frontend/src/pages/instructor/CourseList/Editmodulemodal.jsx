import React, { useState, useRef } from "react";
import { X, Upload, Link, FileText, Video, Save, Loader2, AlignLeft } from "lucide-react";
import api from "../../../api/axios";
import { auth } from "../../../auth/firebase";

const EditModuleModal = ({ module, onClose, onSave }) => {
  const [title, setTitle] = useState(module.title || "");
  const [type, setType] = useState(module.type === "text" ? "text_stream" : (module.type || "video"));
  const [contentUrl, setContentUrl] = useState(module.content_url || "");
  const [notes, setNotes] = useState(module.notes || "");
  const [durationMins, setDurationMins] = useState(module.duration_mins ?? module.duration ?? "");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState(module.pdf_filename || "");
  const [inputMode, setInputMode] = useState("link");
  const [notesInputMode, setNotesInputMode] = useState("link");
  const [notesFileName, setNotesFileName] = useState("");
  const [notesUploading, setNotesUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const notesFileInputRef = useRef(null);

  const initial = {
    title: module.title || "",
    type: module.type === "text" ? "text_stream" : (module.type || "video"),
    contentUrl: module.content_url || "",
    notes: module.notes || "",
    durationMins: String(module.duration_mins ?? module.duration ?? ""),
  };

  const ACCEPT_MAP = {
    video: "video/*",
    pdf: "application/pdf",
    text_stream: ".txt,.md,text/plain",
  };

  const uploadToStorage = async (uploadFile) => {
    const token = await auth.currentUser.getIdToken();
    const payload = new FormData();
    payload.append("file", uploadFile);
    const res = await api.post("/api/upload", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data.url;
  };

  const handleFileChange = (e) => {
    const nextFile = e.target.files[0];
    if (!nextFile) return;
    if (type === "pdf" && nextFile.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    setError("");
    setFile(nextFile);
    setFileName(nextFile.name);
  };

  const handleNotesFileChange = async (e) => {
    const nextFile = e.target.files[0];
    if (!nextFile) return;
    if (nextFile.type !== "application/pdf") {
      setError("Optional notes must be a PDF file.");
      return;
    }
    try {
      setError("");
      setNotesUploading(true);
      const uploadedUrl = await uploadToStorage(nextFile);
      setNotes(uploadedUrl);
      setNotesFileName(nextFile.name);
    } catch {
      setError("Failed to upload notes PDF.");
    } finally {
      setNotesUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const formData = new FormData();
      const normalizedTitle = title.trim();
      const normalizedNotes = notes.trim();
      const normalizedContentUrl = contentUrl.trim();
      const normalizedDuration = String(durationMins ?? "").trim();

      if (normalizedTitle !== initial.title) formData.append("title", normalizedTitle);
      if (type !== initial.type) formData.append("type", type);
      if (normalizedNotes !== initial.notes) formData.append("notes", normalizedNotes);
      if (normalizedDuration !== initial.durationMins) formData.append("duration_mins", normalizedDuration);

      if (inputMode === "link") {
        if (normalizedContentUrl !== initial.contentUrl) {
          formData.append("content_url", normalizedContentUrl);
        }
      } else if (file) {
        if (type === "pdf") {
          formData.append("file", file);
        } else {
          const uploadedUrl = await uploadToStorage(file);
          formData.append("content_url", uploadedUrl);
        }
      }

      if ([...formData.keys()].length === 0) {
        onClose();
        return;
      }

      await onSave(module.module_id, formData);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const typeConfig = {
    video: { icon: Video, label: "Video", color: "text-violet-600 bg-violet-50 border-violet-200" },
    pdf: { icon: FileText, label: "PDF", color: "text-rose-600 bg-rose-50 border-rose-200" },
    text_stream: { icon: AlignLeft, label: "Text Stream", color: "text-sky-600 bg-sky-50 border-sky-200" },
  };

  const urlPlaceholders = {
    video: "https://youtube.com/watch?v=...",
    pdf: "https://example.com/document.pdf",
    text_stream: "https://example.com/article",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800">Edit Module</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update the content and metadata for this module.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Module Type
            </label>
            <div className="flex gap-2">
              {Object.entries(typeConfig).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setType(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                      type === key
                        ? cfg.color
                        : "text-slate-500 bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Icon size={13} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Module title..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition-all"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Source</label>
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-3 w-fit">
              <button
                onClick={() => setInputMode("link")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  inputMode === "link" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Link size={12} /> Link / URL
              </button>
              <button
                onClick={() => setInputMode("upload")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  inputMode === "upload" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Upload size={12} /> Upload File
              </button>
            </div>

            {inputMode === "link" ? (
              <div className="relative">
                <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  placeholder={urlPlaceholders[type]}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg px-4 py-4 cursor-pointer transition-colors group"
              >
                <div className="p-2 rounded-md bg-slate-100 group-hover:bg-indigo-50 transition-colors">
                  <Upload size={16} className="text-slate-500 group-hover:text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {fileName ? (
                    <>
                      <p className="text-sm font-semibold text-slate-700 truncate">
                        {fileName}
                      </p>
                      <p className="text-xs text-slate-400">Click to replace</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-600">
                        Click to upload content
                      </p>
                      <p className="text-xs text-slate-400">{type === "pdf" ? "PDF files only" : "Select a file to upload"}</p>
                    </>
                  )}
                </div>
              </div>
            )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_MAP[type]}
                className="hidden"
                onChange={handleFileChange}
              />
          </div>

          {/* Duration */}
          {type !== "text_stream" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                placeholder="e.g. 15"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>
          )}

          {/* Optional Notes (PDF) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Optional Notes (PDF)</label>
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-3 w-fit">
              <button
                onClick={() => setNotesInputMode("link")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  notesInputMode === "link" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Link size={12} /> PDF Link
              </button>
              <button
                onClick={() => setNotesInputMode("upload")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  notesInputMode === "upload" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Upload size={12} /> Upload PDF
              </button>
            </div>
            {notesInputMode === "link" ? (
              <input
                type="url"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="https://example.com/notes.pdf"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition-all"
              />
            ) : (
              <div
                onClick={() => notesFileInputRef.current?.click()}
                className="flex items-center gap-3 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg px-4 py-4 cursor-pointer transition-colors group"
              >
                <div className="p-2 rounded-md bg-slate-100 group-hover:bg-indigo-50 transition-colors">
                  <Upload size={16} className="text-slate-500 group-hover:text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {notesFileName ? (
                    <>
                      <p className="text-sm font-semibold text-slate-700 truncate">{notesFileName}</p>
                      <p className="text-xs text-slate-400">Click to replace</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-600">Upload optional notes PDF</p>
                      <p className="text-xs text-slate-400">PDF files only</p>
                    </>
                  )}
                </div>
                {notesUploading && <Loader2 size={14} className="animate-spin text-indigo-600" />}
              </div>
            )}
            <input
              ref={notesFileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleNotesFileChange}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModuleModal;