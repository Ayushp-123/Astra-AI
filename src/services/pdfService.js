import * as pdfjsLib from "pdfjs-dist";

// Use the matching worker version for pdfjs-dist 5.7.284
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.7.284/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file, onProgress) {
  let loadingTask = null;
  let pdf = null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    
    loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdf = await loadingTask.promise;
    
    let fullText = "";
    const chunks = [];
    const totalPages = pdf.numPages || 1;
    let readablePagesCount = 0;
    
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map(item => item.str)
        .join(" ")
        .trim();
        
      chunks.push({
        page: i,
        text: pageText
      });
      
      if (pageText) {
        fullText += `[Page ${i}]\n${pageText}\n\n`;
        readablePagesCount++;
      }
      
      // Calculate progress (0 to 100)
      if (onProgress) {
        onProgress(Math.round((i / totalPages) * 100));
      }

      // Yield execution periodically for smooth UI animations on larger PDFs
      if (totalPages > 5 && i % 3 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    const trimmedFullText = fullText.trim();
    const hasExtractableText = trimmedFullText.length > 0;
    
    return {
      fullText: trimmedFullText || "No extractable text found in this PDF (it may be a scanned image or empty document).",
      chunks,
      pageCount: totalPages,
      readablePagesCount,
      hasExtractableText
    };
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    return {
      fullText: "Error reading PDF document.",
      chunks: [],
      pageCount: 0,
      readablePagesCount: 0,
      hasExtractableText: false,
      error: error.message || "Failed to parse PDF"
    };
  } finally {
    try {
      if (pdf && typeof pdf.cleanup === "function") {
        pdf.cleanup();
      }
      if (loadingTask && typeof loadingTask.destroy === "function") {
        loadingTask.destroy();
      }
    } catch {
      // Ignore cleanup error
    }
  }
}
