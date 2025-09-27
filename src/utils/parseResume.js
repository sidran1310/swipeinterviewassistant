
// CRA-safe PDF parsing using pdfjs-dist legacy build with bundled worker URL
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.js';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function fileToArrayBuffer(file) {
  return await file.arrayBuffer();
}

async function parsePdfText(file) {
  const data = await fileToArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(it => it.str);
    fullText += strings.join('\n') + '\n';
  }
  return fullText;
}

async function parseDocxText(file) {
  const arrayBuffer = await fileToArrayBuffer(file);
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value || '';
}

export async function parseResumeToText(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return await parsePdfText(file);
  if (ext === 'docx' || ext === 'doc') return await parseDocxText(file);
  throw new Error('Unsupported file type. Please upload PDF or DOCX.');
}

export function extractFieldsFromText(text) {
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = text.replace(/\s+/g,' ').match(/(\+\d{1,3}[- ]?)?(\d{3}[- ]?\d{3}[- ]?\d{4}|\d{10,15})/);
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let nameGuess = '';
  for (const line of lines.slice(0, 15)) {
    const lower = line.toLowerCase();
    if (lower.startsWith('email') || lower.startsWith('phone') || lower.includes('@')) continue;
    if (/[a-zA-Z]{2,}\s+[a-zA-Z]{2,}/.test(line)) { nameGuess = line; break; }
  }
  const name = nameGuess || '';
  const email = emailMatch ? emailMatch[0] : '';
  const phone = phoneMatch ? phoneMatch[0] : '';
  return { name, email, phone };
}
