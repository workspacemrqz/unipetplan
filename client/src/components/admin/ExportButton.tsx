import { useState } from "react";
import { Button } from "@/components/admin/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
import { Download, File, FileText, Loader2 } from "lucide-react";
import { exportToPDF, exportToExcel } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns?: {
    key: string;
    label: string;
    formatter?: (value: any) => string;
  }[];
  title?: string;
  pageName?: string;
  disabled?: boolean;
  prepareData?: () => Promise<any[]>;
}

export function ExportButton({
  data,
  filename,
  columns,
  title,
  pageName,
  disabled = false,
  prepareData,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPreparingData, setIsPreparingData] = useState(false);
  const { toast } = useToast();

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      let exportData = data;
      if (prepareData) {
        setIsPreparingData(true);
        toast({
          title: "Preparando dados...",
          description: "Buscando informações completas para exportação.",
        });
        exportData = await prepareData();
        setIsPreparingData(false);
      }
      
      await exportToPDF({
        data: exportData,
        columns: columns || [],
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
      
      let exportData = data;
      if (prepareData) {
        setIsPreparingData(true);
        toast({
          title: "Preparando dados...",
          description: "Buscando informações completas para exportação.",
        });
        exportData = await prepareData();
        setIsPreparingData(false);
      }
      
      await exportToExcel({
        data: exportData,
        columns: columns || [],
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
          <FileText className="h-4 w-4 mr-2" />
          Exportar como PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <File className="h-4 w-4 mr-2" />
          Exportar como Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}