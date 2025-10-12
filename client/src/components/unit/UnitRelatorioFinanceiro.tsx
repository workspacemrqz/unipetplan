import { useState, useEffect } from 'react';
import { Button } from "@/components/admin/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialEntry {
  id: string;
  date: string;
  clientName: string;
  petName: string;
  procedure: string;
  coparticipacao: string;
  value: string;
}

export default function UnitRelatorioFinanceiro({ unitSlug }: { unitSlug: string }) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialReport();
  }, [unitSlug]);

  const fetchFinancialReport = async () => {
    try {
      const token = localStorage.getItem('unit-token');
      const response = await fetch(`/api/units/${unitSlug}/relatorio-financeiro`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Erro ao buscar relatório financeiro:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value || '0');
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Relatório Financeiro</h1>
        <p className="text-muted-foreground">
          Visualize todos os procedimentos realizados pela unidade
        </p>
      </div>

      <div className="border border-[#eaeaea] rounded-lg bg-white shadow-sm">
        <div className="rounded-lg overflow-hidden">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-white border-b border-[#eaeaea]">
                <TableHead className="w-[100px] bg-white">Nº</TableHead>
                <TableHead className="w-[120px] bg-white">Data</TableHead>
                <TableHead className="w-[200px] bg-white">Cliente</TableHead>
                <TableHead className="w-[180px] bg-white">Procedimento</TableHead>
                <TableHead className="w-[120px] bg-white">Coparticipação</TableHead>
                <TableHead className="w-[120px] bg-white">Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="text-center py-6">
                      <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : entries && entries.length > 0 ? (
                entries.map((entry, index) => (
                  <TableRow key={entry.id} className="bg-white border-b border-[#eaeaea]">
                    <TableCell className="font-medium bg-white">
                      {index + 1}
                    </TableCell>
                    <TableCell className="whitespace-nowrap bg-white">
                      {entry.date && format(new Date(entry.date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="bg-white">
                      <div className="flex flex-col">
                        <span className="font-medium">{entry.clientName}</span>
                        {entry.petName && (
                          <span className="text-sm text-muted-foreground">{entry.petName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="bg-white">
                      {entry.procedure}
                    </TableCell>
                    <TableCell className="whitespace-nowrap bg-white">
                      {formatCurrency(entry.coparticipacao)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap bg-white">
                      {formatCurrency(entry.value)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="bg-white border-b border-[#eaeaea]">
                  <TableCell colSpan={6} className="text-center py-12 bg-white">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum procedimento realizado ainda.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
