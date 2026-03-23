import { useState, useEffect, useRef } from "react";
import { AlertCircle, Loader } from "lucide-react";
import api from "../api/axios";

/**
 * TextStreamPlayer Component
 * 
 * Displays text_stream module content in an iframe.
 * Supports HTML, Markdown, and plain text content from URLs or embedded content.
 * 
 * Props:
 *  - moduleId: string - ID of the module to fetch content for
 *  - url: string (optional) - URL to fetch content from (falls back to backend if not provided)
 *  - onComplete: function (optional) - Callback when content is loaded/viewed
 */
const TextStreamPlayer = ({ moduleId, url, onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [htmlContent, setHtmlContent] = useState("");
  const iframeRef = useRef(null);
  const contentLoadedRef = useRef(false);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch content from backend using the stream endpoint
        // This endpoint returns the text chunks for the module
        const response = await api.get(`/api/modules/${moduleId}/stream`);
        
        if (response.data?.chunks && Array.isArray(response.data.chunks)) {
          // Combine all chunks to get full content
          const content = response.data.chunks
            .map(chunk => chunk.content || chunk)
            .join("");
          
          // Detect content type
          let type = "text";
          const isHtml = /<[a-z][\s\S]*>/i.test(content);
          
          // Detect markdown (basic check)
          const isMarkdown = content.includes("# ") || 
                           content.includes("## ") || 
                           content.includes("- ");
          
          if (isHtml) {
            type = "html";
          } else if (isMarkdown) {
            type = "markdown";
          }
          
          // For HTML, wrap in a proper HTML document
          let wrappedContent = "";
          if (isHtml) {
            wrappedContent = `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Content</title>
                <style>
                  * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                  }
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background: #fff;
                    padding: 20px;
                  }
                  img {
                    max-width: 100%;
                    height: auto;
                  }
                  a {
                    color: #4f46e5;
                    text-decoration: none;
                  }
                  a:hover {
                    text-decoration: underline;
                  }
                  code {
                    background: #f3f4f6;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: "Courier New", monospace;
                    font-size: 0.9em;
                  }
                  pre {
                    background: #f3f4f6;
                    padding: 12px;
                    border-radius: 4px;
                    overflow-x: auto;
                    margin: 12px 0;
                  }
                  h1, h2, h3, h4, h5, h6 {
                    margin-top: 16px;
                    margin-bottom: 8px;
                    color: #1f2937;
                  }
                  p {
                    margin-bottom: 12px;
                  }
                  ul, ol {
                    margin-left: 20px;
                    margin-bottom: 12px;
                  }
                  li {
                    margin-bottom: 4px;
                  }
                  blockquote {
                    border-left: 4px solid #4f46e5;
                    padding-left: 12px;
                    margin: 12px 0;
                    color: #666;
                  }
                  table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 12px 0;
                  }
                  th, td {
                    border: 1px solid #e5e7eb;
                    padding: 8px;
                    text-align: left;
                  }
                  th {
                    background: #f3f4f6;
                    font-weight: 600;
                  }
                </style>
              </head>
              <body>
                ${content}
              </body>
              </html>
            `;
          } else {
            // For text/markdown, wrap in pre tag for display
            wrappedContent = `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Content</title>
                <style>
                  * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                  }
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background: #fff;
                    padding: 20px;
                  }
                  pre {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-family: "Courier New", monospace;
                    background: #f3f4f6;
                    padding: 12px;
                    border-radius: 4px;
                  }
                </style>
              </head>
              <body>
                <pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
              </body>
              </html>
            `;
          }
          
          setHtmlContent(wrappedContent);
        }
        
        setLoading(false);
        
        // Call onComplete callback if provided
        if (onComplete && !contentLoadedRef.current) {
          contentLoadedRef.current = true;
          onComplete();
        }
      } catch (err) {
        console.error("Error fetching text stream content:", err);
        setError(
          err?.response?.data?.message || 
          err?.response?.statusText ||
          "Failed to load content. Please try again."
        );
        setLoading(false);
      }
    };

    if (moduleId) {
      fetchContent();
    }
  }, [moduleId, onComplete]);

  // Create blob URL for iframe
  const iframeUrl = htmlContent ? URL.createObjectURL(new Blob([htmlContent], { type: "text/html" })) : "";

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (iframeUrl) {
        URL.revokeObjectURL(iframeUrl);
      }
    };
  }, [iframeUrl]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader size={48} className="text-indigo-500 animate-spin" />
          <p className="text-slate-600">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle size={48} className="text-red-500" />
          <h3 className="text-lg font-bold text-slate-800">Error Loading Content</h3>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-white">
      <iframe
        ref={iframeRef}
        src={iframeUrl}
        title="Text Stream Content"
        className="w-full h-full border-0"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        scrolling="auto"
      />
    </div>
  );
};

export default TextStreamPlayer;
