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
  let headers: string[] = [];
  
  if (columns && columns.length > 0) {
    // Create header row with labels
    headers = columns.map(col => col.label);
    
    // Format data rows
    const dataRows = data.map(row => {
      const values: any[] = [];
      columns.forEach(col => {
        const value = getNestedValue(row, col.key);
        const formattedValue = col.formatter ? col.formatter(value, row) : formatValue(value);
        values.push(formattedValue);
      });
      return values;
    });
    
    // Combine headers and data
    worksheetData = [headers, ...dataRows];
  } else {
    // Create a more organized structure for raw data
    if (data.length > 0) {
      // Get all unique keys from all data objects
      const allKeys = new Set<string>();
      data.forEach(row => {
        Object.keys(row).forEach(key => allKeys.add(key));
      });
      
      // Convert keys to array and sort them for consistency
      const sortedKeys = Array.from(allKeys).sort((a, b) => {
        // Priority order for common fields
        const priorityOrder = [
          'Nome Completo', 'Email', 'Telefone', 'CPF', 
          'CEP', 'Endereço', 'Cidade', 'Estado',
          'Data de Cadastro', 'Última Atualização'
        ];
        
        const aIndex = priorityOrder.indexOf(a);
        const bIndex = priorityOrder.indexOf(b);
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // Put Pet fields after client fields
        if (a.startsWith('Pet ') && !b.startsWith('Pet ')) return 1;
        if (!a.startsWith('Pet ') && b.startsWith('Pet ')) return -1;
        
        return a.localeCompare(b);
      });
      
      // Create headers
      headers = sortedKeys;
      
      // Create data rows
      const dataRows = data.map(row => {
        return sortedKeys.map(key => formatValue(row[key]));
      });
      
      worksheetData = [headers, ...dataRows];
    }
  }
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Create worksheet from array of arrays
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Apply styles to header row
  if (headers.length > 0) {
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    
    // Style header cells
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      // Add bold style to headers (note: basic XLSX doesn't support full styling, 
      // but we can at least ensure proper formatting)
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "277677" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }
  }
  
  // Calculate optimal column widths
  const columnWidths: { wch: number }[] = [];
  
  if (worksheetData.length > 0) {
    const numCols = worksheetData[0].length;
    
    for (let col = 0; col < numCols; col++) {
      let maxWidth = 10; // minimum width
      
      // Check all rows for this column
      worksheetData.forEach(row => {
        if (row[col]) {
          const cellLength = String(row[col]).length;
          maxWidth = Math.max(maxWidth, cellLength);
        }
      });
      
      // Cap maximum width and add some padding
      columnWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    }
    
    ws['!cols'] = columnWidths;
  }
  
  // Set print settings for better output
  ws['!pageSetup'] = {
    orientation: 'landscape',
    fitToWidth: 1,
    fitToHeight: 0
  };
  
  // Add autofilter to the data range
  if (worksheetData.length > 1) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  }
  
  // Add worksheet to workbook with a clean name
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Add workbook properties
  wb.Props = {
    Title: sheetName,
    Author: "UnipetPlan",
    CreatedDate: new Date()
  };
  
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