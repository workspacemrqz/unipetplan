import { useState } from "react";
import { Button } from "@/components/admin/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
import { Download, Loader2 } from "lucide-react";
import { exportToPDF, exportToExcel } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns?: {
    key: string;
    label: string;
    formatter?: (value: any, row?: any) => string;
  }[];
  // Configurações separadas para PDF
  pdfColumns?: {
    key: string;
    label: string;
    formatter?: (value: any, row?: any) => string;
  }[];
  preparePdfData?: () => Promise<any[]>;
  // Configurações separadas para Excel
  excelColumns?: {
    key: string;
    label: string;
    formatter?: (value: any, row?: any) => string;
  }[];
  prepareExcelData?: () => Promise<any[]>;
  // Configurações gerais
  title?: string;
  pageName?: string;
  disabled?: boolean;
  prepareData?: () => Promise<any[]>;
  // Colunas visíveis (do useColumnPreferences)
  visibleColumns?: string[];
}

export function ExportButton({
  data,
  filename,
  columns,
  pdfColumns,
  preparePdfData,
  excelColumns,
  prepareExcelData,
  title,
  pageName,
  disabled = false,
  prepareData,
  visibleColumns,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPreparingData, setIsPreparingData] = useState(false);
  const { toast } = useToast();

  // Função auxiliar para filtrar colunas com base nas colunas visíveis
  const filterColumnsByVisible = (cols: typeof columns) => {
    if (!cols || !visibleColumns || visibleColumns.length === 0) {
      return cols || [];
    }
    // Filtra apenas as colunas cujo label está nas colunas visíveis
    return cols.filter(col => visibleColumns.includes(col.label));
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      // Use preparePdfData se disponível, senão use prepareData, senão use data direto
      let exportData = data;
      const prepareFn = preparePdfData || prepareData;
      
      if (prepareFn) {
        setIsPreparingData(true);
        toast({
          title: "Preparando dados...",
          description: "Buscando informações para exportação PDF.",
        });
        exportData = await prepareFn();
        setIsPreparingData(false);
      }
      
      // Use pdfColumns se disponível, senão use columns
      let columnsToUse = pdfColumns || columns || [];
      
      // Aplica filtro de colunas visíveis
      columnsToUse = filterColumnsByVisible(columnsToUse);
      
      await exportToPDF({
        data: exportData,
        columns: columnsToUse,
        filename: `${filename}.pdf`,
        title: title || filename,
      });
      toast({
        title: "Exportação concluída",
        description: "PDF exportado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsPreparingData(false);
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      
      // Use prepareExcelData se disponível, senão use prepareData, senão use data direto
      let exportData = data;
      const prepareFn = prepareExcelData || prepareData;
      
      if (prepareFn) {
        setIsPreparingData(true);
        toast({
          title: "Preparando dados...",
          description: "Buscando informações completas para exportação Excel.",
        });
        exportData = await prepareFn();
        setIsPreparingData(false);
      }
      
      // Use excelColumns se disponível, senão use columns
      let columnsToUse = excelColumns || columns || [];
      
      // Aplica filtro de colunas visíveis
      columnsToUse = filterColumnsByVisible(columnsToUse);
      
      await exportToExcel({
        data: exportData,
        columns: columnsToUse,
        filename: `${filename}.xlsx`,
        sheetName: pageName || filename,
      });
      toast({
        title: "Exportação concluída",
        description: "Excel exportado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o Excel. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsPreparingData(false);
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting || isPreparingData || !data || data.length === 0}
          style={{
            borderColor: 'var(--border-gray)',
            background: 'white'
          }}
        >
          {isExporting || isPreparingData ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isPreparingData ? "Preparando..." : "Exportando..."}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-lg shadow-lg shadow-primary/10">
        <DropdownMenuItem onClick={handleExportPDF}>
          Exportar como PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          Exportar como Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}