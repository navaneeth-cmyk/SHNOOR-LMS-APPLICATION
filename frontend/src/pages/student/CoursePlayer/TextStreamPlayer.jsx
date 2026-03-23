import React, { useState, useEffect } from "react";

const TextStreamPlayer = ({ moduleId, url, onComplete }) => {
  const [fetchedHtml, setFetchedHtml] = useState(null);
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [gammaUrl, setGammaUrl] = useState(null);

  useEffect(() => {
    setGammaUrl(null);
    setFetchedHtml(null);
    setLoadingHtml(false);

    // Check if URL itself is gamma.app first
    if (url && typeof url === "string" && url.includes("gamma.app")) {
      setGammaUrl(url);
      return;
    }

    // Only fetch to detect gamma.app in HTML, otherwise use direct URL
    if (
      url &&
      typeof url === "string" &&
      url.toLowerCase().endsWith(".html") &&
      url.includes("supabase.co")
    ) {
      setLoadingHtml(true);
      fetch(url)
        .then((res) => res.text())
        .then((htmlText) => {
          // Look for gamma.app URLs in iframes
          const gammaMatch = htmlText.match(
            /(?:src|href)\s*=\s*["'](https?:\/\/[^"']*gamma\.app[^"']*)["']/i
          );
          if (gammaMatch) {
            setGammaUrl(gammaMatch[1]);
            return;
          }
          // If no gamma URL found, don't use srcDoc - just use direct URL
          setFetchedHtml(null);
        })
        .catch((err) => {
          console.error("Failed to fetch HTML:", err);
          setFetchedHtml(null);
        })
        .finally(() => setLoadingHtml(false));
    }
  }, [url]);

  // Gamma fallback
  if (gammaUrl) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 p-8 gap-4">
        <div className="text-5xl">🎯</div>
        <h3 className="text-white text-xl font-bold">Presentation Ready</h3>
        <p className="text-slate-400 text-sm text-center max-w-sm">
          This presentation cannot be embedded directly. Click below to open it.
        </p>
        <a
          href={gammaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
        >
          Open Presentation ↗
        </a>
      </div>
    );
  }

  // No URL
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 bg-slate-900 border-2 border-dashed border-slate-700 p-8 rounded-xl">
        <h3 className="text-xl font-bold mb-2">Text Stream Unavailable</h3>
        <p>The URL for this reading material is missing or invalid.</p>
      </div>
    );
  }

  // Loading
  if (loadingHtml) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 bg-slate-900 border-2 border-dashed border-slate-700 p-8 rounded-xl">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Loading document...</p>
      </div>
    );
  }

  // Fetched local HTML file
  if (fetchedHtml !== null) {
    return (
      <div className="relative w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200">
        <iframe
          srcDoc={fetchedHtml}
          className="w-full h-full border-0 bg-white"
          title="Reading Material"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen; clipboard-read"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    );
  }

  // Embed code pasted directly (e.g. <iframe ...>)
  const isEmbedCode =
    url.trim().toLowerCase().startsWith("<iframe") ||
    url.trim().toLowerCase().startsWith("<div");

  if (isEmbedCode) {
    let embedHtml = url.trim();
    if (embedHtml.toLowerCase().includes("<iframe")) {
      embedHtml = embedHtml.replace(
        /<iframe/i,
        `<iframe style="width: 100%; height: 100%; border: none;" allow="fullscreen" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-top-navigation" `
      );
    }
    return (
      <div
        className="relative w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl flex items-center justify-center [&>iframe]:w-full [&>iframe]:h-full"
        dangerouslySetInnerHTML={{ __html: embedHtml }}
      />
    );
  }

  // Final fallback: don't embed gamma.app URLs - show button instead
  if (url && typeof url === "string" && url.includes("gamma.app")) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 p-8 gap-4">
        <div className="text-5xl">🎯</div>
        <h3 className="text-white text-xl font-bold">Presentation Ready</h3>
        <p className="text-slate-400 text-sm text-center max-w-sm">
          This presentation cannot be embedded directly. Click below to open it.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
        >
          Open Presentation ↗
        </a>
      </div>
    );
  }

  // All other URLs
  return (
    <div className="relative w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200">
      <iframe
        src={url}
        className="w-full h-full border-0 bg-white"
        title="Reading Material"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen; clipboard-read"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
};

export default TextStreamPlayer;