import React, { useState, useEffect } from "react";

const TextStreamPlayer = ({ moduleId, url, onComplete }) => {
  const [fetchedHtml, setFetchedHtml] = useState(null);
  const [loadingHtml, setLoadingHtml] = useState(false);

  useEffect(() => {
    // If the url is a local uploaded HTML file, fetch it and sanitize inner Gamma links
    if (url && typeof url === 'string' && url.toLowerCase().endsWith(".html") && url.includes(window.location.hostname)) {
      setLoadingHtml(true);
      fetch(url)
        .then(res => res.text())
        .then(htmlText => {
          // Normalize any embedded gamma.app links found inside the HTML file
          let fixedHtml = htmlText;
          
          // Replace problematic iframes with clickable links
          fixedHtml = fixedHtml.replace(/<iframe[^>]*src\s*=\s*["']([^"']*(gamma\.app|pdf)[^"']*)["'][^>]*>/gi, (match, url) => {
            return `<a href="${url}" target="_blank" style="display: inline-block; padding: 12px 20px; margin: 10px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Open in New Tab</a>`;
          });
          
          // Replace gamma.app URLs in src attributes with direct links only
          fixedHtml = fixedHtml.replace(/src\s*=\s*["']([^"']*gamma\.app\/(?:docs|public|present|embed)\/[^"']*)["']/gi, (match, url) => {
            // Replace with a clickable link instead of iframe
            return `data-external-url="${url}"`;
          });
          
          // Replace gamma.app URLs in href attributes with embed format where possible
          fixedHtml = fixedHtml.replace(/href\s*=\s*["']([^"']*gamma\.app\/(?:docs|public|present|embed)\/[^"']*)["']/gi, (match, url) => {
            const normalizedUrl = url.replace(/gamma\.app\/(docs|public|present)\//i, 'gamma.app/embed/');
            return `href="${normalizedUrl}" target="_blank"`;
          });
          
          // Also handle protocol-relative and absolute URLs
          fixedHtml = fixedHtml.replace(/(?:https?:)?\/\/gamma\.app\/(docs|public|present)\//gi, 'https://gamma.app/embed/');
          
          setFetchedHtml(fixedHtml);
        })
        .catch(err => {
          console.error("Failed to fetch HTML text stream:", err);
          setFetchedHtml(null);
        })
        .finally(() => setLoadingHtml(false));
    } else {
      setFetchedHtml(null);
    }
  }, [url]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 bg-slate-900 border-2 border-dashed border-slate-700 p-8 rounded-xl">
        <h3 className="text-xl font-bold mb-2">Text Stream Unavailable</h3>
        <p>The URL for this reading material is missing or invalid.</p>
      </div>
    );
  }

  if (loadingHtml) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 bg-slate-900 border-2 border-dashed border-slate-700 p-8 rounded-xl">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Loading document...</p>
      </div>
    );
  }

  let finalUrl = url;
  const isGammaUrl = finalUrl.includes("gamma.app");
  
  // Normalize Gamma URLs to their embed format so they don't get blocked by X-Frame-Options
  if (isGammaUrl && !finalUrl.includes("/embed/")) {
    finalUrl = finalUrl.replace(/gamma\.app\/[a-zA-Z0-9_-]+\//i, "gamma.app/embed/");
  }

  // Use the fetched and normalized HTML if we processed a local HTML file
  if (fetchedHtml !== null) {
    return (
      <div className="relative w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200">
        <iframe
          srcDoc={fetchedHtml}
          className="w-full h-full border-0 bg-white"
          title="Reading Material"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen; clipboard-read"
        />
      </div>
    );
  }

  // Check if the input is actually an HTML snippet (e.g., iframe embed code) pasted by the instructor
  const isEmbedCode = finalUrl.trim().toLowerCase().startsWith("<iframe") || finalUrl.trim().toLowerCase().startsWith("<div");

  if (isEmbedCode) {
    let embedHtml = finalUrl.trim();
    
    // Normalize any Gamma.app links in the embed code
    embedHtml = embedHtml.replace(/(?:https?:)?\/\/gamma\.app\/(docs|public|present)\//gi, 'https://gamma.app/embed/');
    
    // Ensure the pasted iframe fills the container
    if (embedHtml.toLowerCase().includes("<iframe")) {
        embedHtml = embedHtml.replace(/<iframe/i, `<iframe style="width: 100%; height: 100%; border: none;" allow="fullscreen" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-top-navigation" `);
    }
    
    return (
      <div 
        className="relative w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl flex items-center justify-center [&>iframe]:w-full [&>iframe]:h-full"
        dangerouslySetInnerHTML={{ __html: embedHtml }}
      />
    );
  }

  return (
    <div className="relative w-full h-full bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200">
      <iframe
        src={finalUrl}
        className="w-full h-full border-0 bg-white"
        title="Reading Material"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        sandbox={isGammaUrl ? "allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-top-navigation" : "allow-scripts allow-same-origin allow-popups allow-forms"}
      />
    </div>
  );
};

export default TextStreamPlayer;