import { jsPDF } from "jspdf";

export function downloadSimplePdf(
  title: string,
  lines: string[],
  filename: string,
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(11);

  let y = 32;
  lines.forEach((line) => {
    doc.text(line, 14, y);
    y += 8;
  });

  doc.save(filename);
}
