import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: any, row?: any) => string;
}

interface PDFExportOptions {
  data: any[];
  columns?: ExportColumn[];
  filename: string;
  title?: string;
}

interface ExcelExportOptions {
  data: any[];
  columns?: ExportColumn[];
  filename: string;
  sheetName?: string;
}

export async function exportToPDF({
  data,
  columns,
  filename,
  title,
}: PDFExportOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    floatPrecision: 16
  });
  
  // Set font to Helvetica which has better support for special characters
  doc.setFont('helvetica');
  
  // Add title
  if (title) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 15);
    doc.setFont('helvetica', 'normal');
  }
  
  // Prepare table data
  let tableColumns: string[] = [];
  let tableRows: any[][] = [];
  
  if (columns && columns.length > 0) {
    tableColumns = columns.map(col => col.label);
    tableRows = data.map(row => 
      columns.map(col => {
        const value = getNestedValue(row, col.key);
        if (col.formatter) {
          // Pass both value and row to formatter
          return String(col.formatter(value, row) || '');
        }
        return String(formatValue(value) || '');
      })
    );
  } else {
    // Auto-generate columns from data keys
    if (data.length > 0) {
      tableColumns = Object.keys(data[0]).map(key => 
        key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
      );
      tableRows = data.map(row => 
        Object.values(row).map(value => String(formatValue(value) || ''))
      );
    }
  }
  
  // Add table with improved configuration
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: title ? 25 : 10,
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
      cellWidth: 'auto',
      halign: 'left',
      valign: 'middle',
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [39, 118, 119], // Teal color
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      // Ensure text doesn't break incorrectly
      0: { cellWidth: 'auto' },
    },
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    tableWidth: 'auto',
    showHead: 'firstPage',
    tableLineColor: [200, 200, 200],
    tableLineWidth: 0.1,
    // Prevent text from being split incorrectly
    didParseCell: function(data: any) {
      // Ensure the text is treated as a single string
      if (data.cell && data.cell.text) {
        data.cell.text = Array.isArray(data.cell.text) ? data.cell.text : [data.cell.text];
      }
    },
  });
  
  // Add footer with export date
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Exportado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      14,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10
    );
  }
  
  // Save the PDF
  doc.save(filename);
}

// Helper function to get nested values from objects
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return value;
}

export async function exportToExcel({
  data,
  columns,
  filename,
  sheetName = 'Dados',
}: ExcelExportOptions) {
  let worksheetData: any[] = [];
  
  if (columns && columns.length > 0) {
    // Create header row
    const headers = columns.reduce((acc, col) => {
      acc[col.key] = col.label;
      return acc;
    }, {} as any);
    
    // Format data rows
    worksheetData = data.map(row => {
      const formattedRow: any = {};
      columns.forEach(col => {
        const value = getNestedValue(row, col.key);
        formattedRow[col.key] = col.formatter ? col.formatter(value, row) : formatValue(value);
      });
      return formattedRow;
    });
    
    // Add headers as first row
    worksheetData.unshift(headers);
  } else {
    // Use data as-is with formatted values
    worksheetData = data.map(row => {
      const formattedRow: any = {};
      Object.keys(row).forEach(key => {
        formattedRow[key] = formatValue(row[key]);
      });
      return formattedRow;
    });
  }
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(worksheetData, { skipHeader: columns ? true : false });
  
  // Auto-size columns
  const columnWidths = Object.keys(worksheetData[0] || {}).map(key => ({
    wch: Math.max(
      key.length,
      ...worksheetData.map(row => String(row[key] || '').length)
    ) + 2
  }));
  ws['!cols'] = columnWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Save the file
  XLSX.writeFile(wb, filename);
}

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  
  if (value instanceof Date) {
    return format(value, "dd/MM/yyyy HH:mm", { locale: ptBR });
  }
  
  if (typeof value === 'string' && isISODate(value)) {
    try {
      return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return value;
    }
  }
  
  if (typeof value === 'number') {
    if (value.toString().includes('.')) {
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value.toLocaleString('pt-BR');
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

function isISODate(str: string): boolean {
  if (!/\d{4}-\d{2}-\d{2}/.test(str)) return false;
  const date = new Date(str);
  return date instanceof Date && !isNaN(date.getTime());
}