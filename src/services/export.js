import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Export JSON records array to CSV
export function exportToCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export JSON records array to Excel (.xlsx)
export function exportToExcel(data, filename = 'export.xlsx', sheetName = 'Sheet1') {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

// Export formatted table data to PDF document
export function exportToPDF({ title, subtitle, columns, rows, filename = 'report.pdf', orientation = 'portrait' }) {
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4'
  });

  // Header Title
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(title, 14, 18);

  // Subtitle / Date
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(subtitle, 14, 25);
  }

  const startY = subtitle ? 30 : 24;

  doc.autoTable({
    head: [columns],
    body: rows,
    startY: startY,
    theme: 'grid',
    headStyles: {
      fillColor: [2, 132, 199], // sky-600
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { top: startY, left: 14, right: 14 }
  });

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
