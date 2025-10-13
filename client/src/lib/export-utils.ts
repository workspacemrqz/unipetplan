import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportColumn {
  key: string;
  label: string;
  formatter?: (value: any) => string;
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
  const doc = new jsPDF();
  
  // Add title
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 15);
  }
  
  // Prepare table data
  let tableColumns: string[] = [];
  let tableRows: any[][] = [];
  
  if (columns && columns.length > 0) {
    tableColumns = columns.map(col => col.label);
    tableRows = data.map(row => 
      columns.map(col => {
        const value = row[col.key];
        if (col.formatter) {
          return col.formatter(value);
        }
        return formatValue(value);
      })
    );
  } else {
    // Auto-generate columns from data keys
    if (data.length > 0) {
      tableColumns = Object.keys(data[0]).map(key => 
        key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
      );
      tableRows = data.map(row => 
        Object.values(row).map(value => formatValue(value))
      );
    }
  }
  
  // Add table
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: title ? 25 : 10,
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [39, 118, 119], // Teal color
      textColor: 255,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  // Add footer with export date
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
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
        const value = row[col.key];
        formattedRow[col.key] = col.formatter ? col.formatter(value) : formatValue(value);
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