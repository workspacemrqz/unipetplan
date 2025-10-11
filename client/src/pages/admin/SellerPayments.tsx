import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Textarea } from "@/components/admin/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { ArrowLeft, DollarSign, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Seller {
  id: string;
  fullName: string;
  email: string;
}

interface Payment {
  id: string;
  sellerId: string;
  amount: string;
  paymentDate: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
}

interface SalesReport {
  totalSales: number;
  totalRevenue: number;
  totalCpaCommission: number;
  totalRecurringCommission: number;
  totalCommission: number;
  totalPaid: number;
  balance: number;
}

export default function SellerPayments() {
  const [, params] = useRoute("/vendedores/:id/pagamentos");
  const [, setLocation] = useLocation();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sellerId = params?.id;

  const { data: seller } = useQuery<Seller>({
    queryKey: [`/admin/api/sellers/${sellerId}`],
    enabled: !!sellerId,
  });

  const { data: paymentsData } = useQuery<Payment[]>({
    queryKey: [`/admin/api/sellers/${sellerId}/payments`],
    enabled: !!sellerId,
  });
  
  // Ensure payments is always an array
  const payments = Array.isArray(paymentsData) ? paymentsData : [];

  const { data: salesReport, error: salesReportError } = useQuery<SalesReport>({
    queryKey: [`/admin/api/sellers/${sellerId}/sales-report`],
    enabled: !!sellerId,
  });
  
  // Debug log for sales report
  if (salesReportError) {
    console.error("Error fetching sales report:", salesReportError);
  }
  if (salesReport) {
    console.log("Sales report fetched:", salesReport);
  }

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { amount: string; paymentDate: string; description: string }) => {
      const response = await fetch(`/admin/api/sellers/${sellerId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar pagamento");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/admin/api/sellers/${sellerId}/payments`] });
      queryClient.invalidateQueries({ queryKey: [`/admin/api/sellers/${sellerId}/sales-report`] });
      setPaymentDialogOpen(false);
      setAmount("");
      setDescription("");
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
      toast({
        title: "Pagamento registrado",
        description: "Pagamento foi registrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreatePayment = () => {
    if (!amount || parseFloat(amount.replace(",", ".")) <= 0) {
      toast({
        title: "Erro",
        description: "Informe um valor válido",
        variant: "destructive",
      });
      return;
    }

    createPaymentMutation.mutate({
      amount,
      paymentDate,
      description,
    });
  };

  const formatCurrency = (value: number) => {
    // Para valores muito pequenos, mostrar até 4 casas decimais
    const options: Intl.NumberFormatOptions = {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 0.01 && value > 0 ? 4 : 2,
    };
    
    return new Intl.NumberFormat("pt-BR", options).format(value);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground break-words">
          Pagamentos e Comissões
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {seller ? seller.fullName : "Carregando..."}
        </p>
      </div>

      {/* Back Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setLocation("/vendedores")}
        className="w-full sm:w-auto"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {/* Register Payment Button */}
      <Button 
        onClick={() => setPaymentDialogOpen(true)}
        variant="admin-action"
        size="sm"
        className="w-full sm:w-auto"
      >
        <Plus className="h-4 w-4 mr-2" />
        Registrar Pagamento
      </Button>

      {/* Sales Report Cards */}
      {salesReport && (
        <Card style={{ backgroundColor: '#FFFFFF' }}>
          <CardHeader>
            <CardTitle className="text-foreground">Resumo de Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Comissão Total</h3>
                <p className="text-2xl font-bold text-[#257273]">{formatCurrency(salesReport.totalCommission)}</p>
                <div className="mt-2 text-sm text-muted-foreground">
                  <div>CPA: {formatCurrency(salesReport.totalCpaCommission)}</div>
                  <div>Recorrente: {formatCurrency(salesReport.totalRecurringCommission)}</div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Pago</h3>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(salesReport.totalPaid)}</p>
                <div className="mt-2 text-sm text-muted-foreground">
                  {payments.length} pagamento{payments.length !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Saldo a Pagar</h3>
                <p className={`text-2xl font-bold ${salesReport.balance > 0 ? "text-orange-600" : "text-gray-600"}`}>
                  {formatCurrency(salesReport.balance)}
                </p>
                <div className="mt-2 text-sm text-muted-foreground">
                  {salesReport.totalSales} venda{salesReport.totalSales !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card style={{ backgroundColor: '#FFFFFF' }}>
        <CardHeader>
          <CardTitle className="text-foreground">Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Registrado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum pagamento registrado
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.paymentDate), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(parseFloat(payment.amount))}
                    </TableCell>
                    <TableCell>{payment.description || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(payment.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span>Registrar Pagamento</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Valor (R$)</label>
              <Input
                type="text"
                placeholder="Ex: 1.234,56"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use vírgula para decimais (ex: 1.234,56)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Data do Pagamento</label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Descrição (opcional)</label>
              <Textarea
                placeholder="Ex: Pagamento ref. vendas de Janeiro/2025"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreatePayment} disabled={createPaymentMutation.isPending}>
                {createPaymentMutation.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
