import * as pdfjsLib from "pdfjs-dist";

// Use the matching worker version for pdfjs-dist 5.7.284
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.7.284/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file, onProgress) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    
    // We limit pages so we don't freeze for massive PDFs
    const maxPages = Math.min(pdf.numPages, 10);
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map(item => item.str)
        .join(" ");
        
      fullText += pageText + "\n";
      
      // Calculate progress (0 to 100)
      if (onProgress) {
        onProgress(Math.round((i / maxPages) * 100));
      }
    }
    
    return fullText;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    return "Error reading PDF.";
  }
}
