import * as pdfjsLib from "pdfjs-dist"

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`

export async function extractTextFromPDF(file) {

  const arrayBuffer = await file.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer
  }).promise

  let fullText = ""

  // Limit pages for speed
  const maxPages = Math.min(pdf.numPages, 5)

  for (let i = 1; i <= maxPages; i++) {

    const page = await pdf.getPage(i)

    const textContent = await page.getTextContent()

    const pageText = textContent.items
      .map(item => item.str)
      .join(" ")

    fullText += pageText + "\n"
  }

  return fullText
}