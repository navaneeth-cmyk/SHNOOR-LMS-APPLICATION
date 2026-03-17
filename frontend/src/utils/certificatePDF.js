import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Captures a DOM element and downloads it as a PDF.
 * @param {string} elementId - The ID of the element to capture.
 * @param {string} fileName - The name of the downloaded file.
 */
export const exportToPDF = async (elementId, fileName = "certificate.pdf") => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error("Element not found for PDF export:", elementId);
        return;
    }

    try {
        // Wait for all images to fully load before capturing
        const imgs = Array.from(element.querySelectorAll("img"));
        await Promise.all(
            imgs.map(
                (img) =>
                    new Promise((resolve) => {
                        if (img.complete) resolve();
                        else { img.onload = resolve; img.onerror = resolve; }
                    })
            )
        );

        // 1. Capture as canvas with high resolution
        const canvas = await html2canvas(element, {
            scale: 3, // High resolution for professional print
            useCORS: true, // Crucial for external image URLs (Firebase Storage)
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            scrollX: 0,
            scrollY: -window.scrollY,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
            removeContainer: true,
            onclone: (_clonedDoc, clonedEl) => {
                // Force dimensions so CSS variables resolve correctly in the clone
                const computed = window.getComputedStyle(element);
                clonedEl.style.width = computed.width;
                clonedEl.style.height = computed.height;
                // Ensure cross-origin images render in clone
                clonedEl.querySelectorAll("img").forEach((img) => {
                    img.crossOrigin = "anonymous";
                });
            },
        });

        const imgData = canvas.toDataURL("image/png");

        // 2. Initialize PDF (A4 Landscape usually works best for certificates)
        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "px",
            format: [canvas.width, canvas.height],
        });

        const width = pdf.internal.pageSize.getWidth();
        const height = pdf.internal.pageSize.getHeight();

        // 3. Add image to PDF
        pdf.addImage(imgData, "PNG", 0, 0, width, height);

        // 4. Download
        pdf.save(fileName);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Failed to generate PDF. Please try again.");
    }
};