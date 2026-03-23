import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { getEmbedUrl } from '../utils/urlHelper';
import { Clock, CheckCircle, Loader2, Play, Pause, FileText } from 'lucide-react';

const TextStreamPlayer = ({ moduleId, url, authToken }) => {
    const [loading, setLoading] = useState(true);
    const [streamData, setStreamData] = useState(null);
    const [plainTextContent, setPlainTextContent] = useState("");
    const [streamedWordCount, setStreamedWordCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [advancing, setAdvancing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    // Holds the resolved embed URL after parsing HTML wrapper files
    const [resolvedEmbedUrl, setResolvedEmbedUrl] = useState(null);
    const timerRef = useRef(null);
    const plainTextContainerRef = useRef(null);

    const buildPdfViewerUrl = (pdfUrl, token) => {
        if (!pdfUrl) return "";
        const isLocal = pdfUrl.includes("localhost") || pdfUrl.includes("127.0.0.1") || pdfUrl.startsWith("/uploads/");
        const withToken = token ? `${pdfUrl}${pdfUrl.includes("?") ? "&" : "?"}token=${token}` : pdfUrl;
        if (isLocal) return withToken;
        return `https://docs.google.com/viewer?url=${encodeURIComponent(withToken)}&embedded=true`;
    };

    const isProxy = !!url && url.includes("/api/modules/") && url.includes("/view");
    const isPdf = !!url && (/\.pdf($|\?)/i.test(url) || (isProxy && url.includes("type=pdf")));
    const isHtml = !!url && (/\.html?($|\?)/i.test(url) || (isProxy && url.includes("type=html")));
    const isGamma = !!url && url.includes("gamma.app");
    const hasOpenFlag = !!url && url.includes("i=open");

    const isEmbeddable = url && (isPdf || isHtml || isGamma || hasOpenFlag);
    const isPlainTextUrl = !!url && !isEmbeddable && /\.txt($|\?)/i.test(url);
    const WORD_STREAM_DELAY_MS = 650;

    // ✅ ALL hooks must come BEFORE any conditional returns

    /**
     * For HTML wrapper files stored on Supabase (or any storage):
     * The browser shows raw HTML text instead of rendering it because
     * storage buckets serve files without executing them.
     *
     * Strategy: fetch the HTML text, find the inner <iframe src="...">,
     * and embed THAT src directly — completely bypassing the wrapper file.
     *
     * Example wrapper content:
     *   <iframe src="https://gamma.app/embed/abc123" style="..."></iframe>
     * Result: we embed https://gamma.app/embed/abc123 directly.
     */
    useEffect(() => {
        if (!isHtml || !url) {
            setResolvedEmbedUrl(null);
            return;
        }
        let mounted = true;
        const extractInnerSrc = async () => {
            try {
                const res = await fetch(url);
                const html = await res.text();
                // Find the first <iframe src="..."> inside the HTML file
                const match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                if (match && match[1] && mounted) {
                    // ✅ Found inner iframe src — embed it directly
                    setResolvedEmbedUrl(match[1]);
                } else if (mounted) {
                    // No inner iframe — fall back to rendering HTML via srcdoc
                    setResolvedEmbedUrl("__srcdoc__:" + html);
                }
            } catch (err) {
                console.warn("Failed to fetch HTML wrapper:", err);
                if (mounted) setResolvedEmbedUrl(null);
            }
        };
        extractInnerSrc();
        return () => { mounted = false; };
    }, [isHtml, url]);

    // Timer Countdown
    useEffect(() => {
        if (isEmbeddable) return;
        if (!streamData || streamData.completed || advancing || !isPlaying) return;

        if (timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleNext();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (timeLeft === 0 && !advancing) {
            handleNext();
        }

        return () => clearInterval(timerRef.current);
    }, [timeLeft, streamData, advancing, isPlaying]);

    // Fetch initial stream state (skip for embeddable content)
    useEffect(() => {
        if (isEmbeddable) {
            setLoading(false);
            return;
        }

        let mounted = true;
        const fetchStream = async () => {
            try {
                setLoading(true);
                setPlainTextContent("");
                setStreamData(null);
                let triedDirectTextUrl = false;

                // Only attempt plain-text fetch for non-HTML, non-PDF URLs
                if (url && !isHtml && !isPdf) {
                    triedDirectTextUrl = true;
                    try {
                        const textRes = await api.get(url, {
                            responseType: "text",
                            transformResponse: [(data) => data],
                        });
                        const contentType = String(textRes.headers?.["content-type"] || "").toLowerCase();
                        const isPdfResponse = contentType.includes("application/pdf");
                        const isHtmlResponse = contentType.includes("text/html");
                        const textData = typeof textRes.data === "string" ? textRes.data : "";
                        const canRenderAsText =
                            isPlainTextUrl ||
                            contentType.includes("text/plain") ||
                            contentType.includes("text/markdown") ||
                            contentType.includes("application/octet-stream") ||
                            contentType === "";

                        // Never treat HTML or PDF responses as plain text
                        if (!isPdfResponse && !isHtmlResponse && canRenderAsText && textData.length > 0) {
                            if (mounted) {
                                setPlainTextContent(textData);
                                setLoading(false);
                            }
                            return;
                        }
                    } catch (textErr) {
                        console.warn("Plain text fetch failed:", textErr);
                    }

                    if (triedDirectTextUrl) {
                        if (mounted) setLoading(false);
                        return;
                    }
                }

                const res = await api.get(`/api/modules/${moduleId}/stream`);
                if (!mounted) return;

                setStreamData(res.data);
                if (!res.data.completed && (res.data.currentChunk || res.data.chunk)) {
                    setTimeLeft((res.data.currentChunk || res.data.chunk).duration_seconds || 60);
                } else {
                    setTimeLeft(0);
                }
            } catch (err) {
                console.error("Failed to load stream:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchStream();
        return () => { mounted = false; clearInterval(timerRef.current); };
    }, [moduleId, url, isPlainTextUrl]);

    // Word-by-word stream effect for plain-text modules
    useEffect(() => {
        if (!plainTextContent) {
            setStreamedWordCount(0);
            return;
        }
        const words = plainTextContent.match(/\S+\s*/g) || [];
        setStreamedWordCount(words.length > 0 ? 1 : 0);
        if (words.length <= 1) return;
        const wordTimer = setInterval(() => {
            setStreamedWordCount((prev) => {
                if (prev >= words.length) { clearInterval(wordTimer); return prev; }
                return prev + 1;
            });
        }, WORD_STREAM_DELAY_MS);
        return () => clearInterval(wordTimer);
    }, [plainTextContent]);

    useEffect(() => {
        if (!plainTextContainerRef.current) return;
        plainTextContainerRef.current.scrollTop = plainTextContainerRef.current.scrollHeight;
    }, [streamedWordCount]);

    // ✅ Conditional returns AFTER all hooks

    // Render embeddable content (HTML / PDF / Gamma / i=open)
    if (isEmbeddable) {
        // For HTML files: wait until inner src has been resolved
        if (isHtml && resolvedEmbedUrl === null) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Loader2 className="animate-spin mb-2" />
                    <p>Loading content...</p>
                </div>
            );
        }

        let embedSrc = null;
        let srcdocContent = null;

        if (isHtml && resolvedEmbedUrl) {
            if (resolvedEmbedUrl.startsWith("__srcdoc__:")) {
                // No inner iframe found — render raw HTML via srcdoc
                srcdocContent = resolvedEmbedUrl.replace("__srcdoc__:", "");
            } else {
                // Use the extracted inner iframe src directly
                embedSrc = resolvedEmbedUrl;
            }
        } else if (isPdf) {
            embedSrc = buildPdfViewerUrl(url, authToken);
        } else {
            embedSrc = getEmbedUrl(url);
        }

        return (
            <div className="w-full h-full relative bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                <iframe
                    src={embedSrc || undefined}
                    srcDoc={srcdocContent || undefined}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    title="Embedded Content"
                />
                <div className="absolute bottom-4 right-4 bg-slate-900/80 p-2 rounded text-[10px] text-slate-400 z-10 opacity-70 hover:opacity-100 transition-opacity">
                    <span className="mr-2">Not loading?</span>
                    <a href={embedSrc || url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-white underline">
                        Open in new tab
                    </a>
                </div>
            </div>
        );
    }

    // handleNext defined after all hooks and embeddable early-return
    const handleNext = async () => {
        if (advancing) return;
        try {
            setAdvancing(true);
            const res = await api.post(`/api/modules/${moduleId}/stream/next`);
            if (res.data.completed) {
                setStreamData(prev => ({ ...prev, completed: true }));
                setIsPlaying(false);
            } else {
                const nextRes = await api.get(`/api/modules/${moduleId}/stream`);
                setStreamData(nextRes.data);
                if (nextRes.data.currentChunk || nextRes.data.chunk) {
                    setTimeLeft((nextRes.data.currentChunk || nextRes.data.chunk).duration_seconds || 60);
                }
            }
        } catch (err) {
            console.error("Failed to advance stream:", err);
        } finally {
            setAdvancing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 className="animate-spin mb-2" />
                <p>Loading text stream...</p>
            </div>
        );
    }

    if (plainTextContent) {
        const plainTextWords = plainTextContent.match(/\S+\s*/g) || [];
        const streamedText = plainTextWords.slice(0, streamedWordCount).join("");
        const plainTextCompleted = streamedWordCount >= plainTextWords.length;
        return (
            <div ref={plainTextContainerRef} className="h-full bg-slate-900 text-slate-200 p-6 md:p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-4 flex items-center gap-2 text-slate-300">
                        <FileText size={18} />
                        <h3 className="text-sm md:text-base font-semibold">Text Module</h3>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 md:p-7 shadow-xl">
                        <pre className="whitespace-pre-wrap break-words text-[15px] leading-7 font-mono text-slate-100">
                            {streamedText}
                            {!plainTextCompleted && (
                                <span className="inline-block w-2 h-4 bg-indigo-400 ml-1 align-middle animate-pulse" />
                            )}
                        </pre>
                    </div>
                </div>
            </div>
        );
    }

    if (!streamData) {
        if (url && (url.match(/\.html$/i) || url.match(/\.pdf$/i))) {
            return (
                <div className="w-full h-full relative bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                    <iframe
                        src={getEmbedUrl(url)}
                        style={{ width: "100%", height: "100%", border: "none" }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        title="Embedded Content"
                    />
                    <div className="absolute bottom-4 right-4 bg-slate-900/80 p-2 rounded text-xs text-slate-400 z-10">
                        <span className="mr-2">Not loading?</span>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-white underline">
                            Open in new tab
                        </a>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 transition-all animate-in fade-in">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <FileText className="text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Text Content Not Added Yet</h3>
                <p className="text-sm text-center max-w-xs mb-6">
                    This text module does not have readable content yet. Please contact your instructor.
                </p>
                {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer"
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700">
                        Try manual link
                    </a>
                )}
            </div>
        );
    }

    const chunksToShow = streamData.chunks || (streamData.chunk ? [streamData.chunk] : []);
    const { index, total } = streamData;
    const isCompleted = streamData.completed;

    // ✅ Detect if content is HTML and render in iframe
    const fullContent = chunksToShow.map(c => c.content || c).join("");
    const isStreamHtml = /<[a-z][\s\S]*>/i.test(fullContent) && fullContent.includes("<iframe");

    if (isStreamHtml) {
        // Render HTML content in iframe
        const htmlDoc = /<html|<!DOCTYPE/i.test(fullContent.trim())
            ? fullContent
            : `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content</title>
    <style>
        body { margin: 0; padding: 20px; background: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        iframe { width: 100%; max-width: 100%; border: none; }
    </style>
</head>
<body>
    ${fullContent}
</body>
</html>`;

        const iframeUrl = URL.createObjectURL(new Blob([htmlDoc], { type: "text/html;charset=utf-8" }));
        return (
            <div className="w-full h-full relative bg-white rounded-xl overflow-hidden shadow-2xl">
                <iframe
                    src={iframeUrl}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-scripts allow-forms allow-top-navigation allow-pointer-lock allow-presentation"
                    scrolling="auto"
                    allow="fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title="HTML Content"
                    onLoad={() => {
                        setTimeout(() => URL.revokeObjectURL(iframeUrl), 1000);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-900 text-slate-200 relative">
            {!isCompleted && (
                <div className="h-1 bg-slate-800 w-full flex-shrink-0">
                    <div className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${((index + 1) / total) * 100}%` }} />
                </div>
            )}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar pb-8">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl animate-in fade-in duration-500 mb-8">
                        <p className="prose prose-invert max-w-none text-lg leading-relaxed whitespace-pre-wrap font-serif">
                            {chunksToShow.map((chunk, idx) => (
                                <span key={chunk.chunk_id || idx} className="animate-in fade-in duration-300">
                                    {chunk.content}
                                </span>
                            ))}
                            {isPlaying && !isCompleted && (
                                <span className="inline-block w-2 h-4 bg-indigo-400 ml-1 animate-pulse" />
                            )}
                        </p>
                    </div>
                    {isCompleted && (
                        <div className="flex items-center justify-center gap-3 p-6 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 animate-in zoom-in-50">
                            <CheckCircle size={32} />
                            <h2 className="text-2xl font-bold">Module Completed!</h2>
                        </div>
                    )}
                </div>
            </div>
            {!isCompleted && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-slate-800/90 backdrop-blur-md px-8 py-4 rounded-full border border-slate-700 shadow-2xl z-50 transition-all hover:scale-105">
                    <button onClick={() => setIsPlaying(!isPlaying)}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-500 hover:bg-indigo-400 text-white transition-colors shadow-lg shadow-indigo-500/20">
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                    <div className="h-8 w-px bg-slate-700"></div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                            {isPlaying ? "Streaming" : "Paused"}
                        </span>
                        <div className="flex items-center gap-2 text-indigo-300 font-mono font-bold text-lg min-w-[100px]">
                            {advancing ? (
                                <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading...</span>
                            ) : (
                                <>
                                    <Clock size={16} />
                                    <span>{timeLeft}s</span>
                                    <span className="text-sm text-slate-500 font-normal">next line</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TextStreamPlayer;