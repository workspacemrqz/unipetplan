import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDate } from "@internationalized/date";
import UnitLayout from "@/components/unit/UnitLayout";
import { Button } from "@/components/admin/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import LoadingDots from "@/components/ui/LoadingDots";
import { DateFilterComponent } from "@/components/admin/DateFilterComponent";
import { getDateRangeParams } from "@/lib/date-utils";

// Helper function to get the appropriate token based on context
const getAuthToken = () => {
  // Check for unit token
  const unitToken = localStorage.getItem('unit-token');
  if (unitToken) return unitToken;
  
  // Check for veterinarian token  
  const vetToken = localStorage.getItem('veterinarian-token');
  if (vetToken) return vetToken;
  
  return null;
};

// Action type translations
const actionTypeTranslations: Record<string, string> = {
  "client_selected": "Cliente Selecionado",
  "pet_selected": "Pet Selecionado",
  "procedure_added": "Procedimento Adicionado",
  "atendimento_created": "Atendimento Criado",
  "step_changed": "Mudança de Etapa",
  "veterinarian_created": "Veterinário Criado",
  "veterinarian_updated": "Veterinário Atualizado",
  "veterinarian_deleted": "Veterinário Removido",
  "veterinarian_status_changed": "Status de Veterinário Alterado",
};

const getActionTypeLabel = (actionType: string): string => {
  return actionTypeTranslations[actionType] || actionType;
};

interface Log {
  log: {
    id: string;
    actionType: string;
    networkUnitId: string;
    userType: string;
    veterinarianId: string | null;
    actionData: any;
    createdAt: Date | string;
  };
  veterinarian: {
    id: string;
    name: string;
  } | null;
}

interface LogsResponse {
  data: Log[];
  total: number;
  totalPages: number;
  page: number;
}

export default function LogsPage() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [dateFilter, setDateFilter] = useState<{
    startDate: CalendarDate | null;
    endDate: CalendarDate | null;
  }>({ startDate: null, endDate: null });

  const [debouncedDateFilter, setDebouncedDateFilter] = useState<{
    startDate: CalendarDate | null;
    endDate: CalendarDate | null;
  }>({ startDate: null, endDate: null });

  // Debounce date filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDateFilter(dateFilter);
    }, 500);

    return () => clearTimeout(timer);
  }, [dateFilter]);

  useEffect(() => {
    checkAuthentication();
  }, [slug]);

  const checkAuthentication = async () => {
    const token = getAuthToken();
    const unitSlug = localStorage.getItem('unit-slug');
    
    if (!token || unitSlug !== slug) {
      setLocation(`/unidade/${slug}`);
      return;
    }
    
    setLoading(false);
  };

  const handleDateRangeChange = (startDate: CalendarDate | null, endDate: CalendarDate | null) => {
    setDateFilter({ startDate, endDate });
    setCurrentPage(1);
  };

  // Get date range params for the query
  const dateParams = getDateRangeParams(debouncedDateFilter.startDate, debouncedDateFilter.endDate);

  // Construct query parameters
  const queryParams = {
    page: currentPage.toString(),
    limit: pageSize.toString(),
    ...(userTypeFilter !== "all" && { userType: userTypeFilter }),
    ...dateParams
  };

  const { data: logsResponse, isLoading: isLoadingLogs } = useQuery<LogsResponse>({
    queryKey: [`/api/units/${slug}/logs`, queryParams],
    enabled: !loading,
    queryFn: async () => {
      const token = getAuthToken();
      
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const params = new URLSearchParams(queryParams);
      const response = await fetch(`/api/units/${slug}/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar logs');
      }

      return response.json();
    },
  });

  const logs = logsResponse?.data || [];
  const totalLogs = logsResponse?.total || 0;
  const totalPages = logsResponse?.totalPages || 0;

  const getUserLabel = (log: Log): string => {
    if (log.log.userType === "unit") {
      return "Admin";
    } else if (log.log.userType === "veterinarian" && log.veterinarian) {
      return log.veterinarian.name;
    }
    return log.log.userType;
  };

  const formatActionData = (actionType: string, actionData: any): string => {
    if (!actionData) return "-";
    
    try {
      // Format based on action type with descriptive messages
      switch (actionType) {
        case "step_changed":
          if (actionData.from !== undefined && actionData.to !== undefined) {
            return `Avançou da etapa ${actionData.from} para a etapa ${actionData.to}`;
          }
          break;
        
        case "client_selected":
          if (actionData.clientName || actionData.name) {
            return `Selecionou o cliente: ${actionData.clientName || actionData.name}`;
          }
          if (actionData.cpf) {
            return `Selecionou o cliente com CPF: ${actionData.cpf}`;
          }
          break;
        
        case "pet_selected":
          if (actionData.petName || actionData.name) {
            return `Selecionou o pet: ${actionData.petName || actionData.name}`;
          }
          break;
        
        case "procedure_added":
          if (actionData.procedureName || actionData.name) {
            const procedureName = actionData.procedureName || actionData.name;
            const value = actionData.value ? ` no valor de R$ ${actionData.value}` : '';
            return `Adicionou o procedimento: ${procedureName}${value}`;
          }
          break;
        
        case "atendimento_created":
          if (actionData.atendimentoId || actionData.id) {
            return `Finalizou e criou o atendimento com sucesso`;
          }
          break;
        
        case "veterinarian_created":
          if (actionData.name) {
            const type = actionData.type === 'permanente' ? 'Permanente' : 'Volante';
            const access = actionData.canAccessAtendimentos ? 'com acesso a atendimentos' : 'sem acesso a atendimentos';
            return `Criou o veterinário ${type}: ${actionData.name} (${access})`;
          }
          break;
        
        case "veterinarian_updated":
          if (actionData.name) {
            const details = [];
            if (actionData.type) details.push(`Tipo: ${actionData.type === 'permanente' ? 'Permanente' : 'Volante'}`);
            if (actionData.canAccessAtendimentos !== undefined) {
              details.push(`Acesso atendimentos: ${actionData.canAccessAtendimentos ? 'Sim' : 'Não'}`);
            }
            if (actionData.isActive !== undefined) {
              details.push(`Status: ${actionData.isActive ? 'Ativo' : 'Inativo'}`);
            }
            return `Atualizou o veterinário: ${actionData.name} (${details.join(', ')})`;
          }
          break;
        
        case "veterinarian_deleted":
          if (actionData.name) {
            return `Removeu o veterinário: ${actionData.name}`;
          }
          break;
        
        case "veterinarian_status_changed":
          if (actionData.name && actionData.newStatus) {
            return `Alterou status do veterinário ${actionData.name} de ${actionData.oldStatus} para ${actionData.newStatus}`;
          }
          break;
      }
      
      // Fallback: format object as readable string if no specific format matched
      if (typeof actionData === 'object') {
        const entries = Object.entries(actionData);
        if (entries.length === 0) return "-";
        
        return entries
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
      }
      
      return String(actionData);
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-cream-light)]">
        <div className="text-center">
          <LoadingDots size="lg" color="#0e7074" className="mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return (
    <UnitLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">
              Logs de Ações
            </h1>
            <p className="text-sm text-muted-foreground">
              Registro de todas as ações realizadas no sistema (atendimentos, veterinários, etc.)
            </p>
          </div>
        </div>

        {/* Date Filter */}
        <DateFilterComponent
          onDateRangeChange={handleDateRangeChange}
          isLoading={isLoadingLogs ||
            (dateFilter.startDate !== debouncedDateFilter.startDate ||
              dateFilter.endDate !== debouncedDateFilter.endDate)}
          initialRange={dateFilter}
        />

        {/* User Type Filter */}
        <div className="flex flex-wrap gap-4 items-center">
          <Select value={userTypeFilter} onValueChange={(value) => {
            setUserTypeFilter(value);
            setCurrentPage(1);
          }}>
            <SelectTrigger 
              className="w-64 [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
              style={{
                borderColor: 'var(--border-gray)',
                background: 'white'
              }}
            >
              <SelectValue placeholder="Filtrar por usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                Todos os usuários
              </SelectItem>
              <SelectItem value="unit" className="data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                Admin
              </SelectItem>
              <SelectItem value="veterinarian" className="data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                Veterinários
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white">
          {isLoadingLogs ? (
            <div className="flex justify-center py-12">
              <LoadingDots size="lg" color="#0e7074" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum log registrado ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((logEntry) => (
                  <TableRow key={logEntry.log.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(
                        new Date(logEntry.log.createdAt),
                        "dd/MM/yyyy HH:mm:ss"
                      )}
                    </TableCell>
                    <TableCell>
                      {getActionTypeLabel(logEntry.log.actionType)}
                    </TableCell>
                    <TableCell>{getUserLabel(logEntry)}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {formatActionData(logEntry.log.actionType, logEntry.log.actionData)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalLogs > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalLogs > 0 ? (
                    <>Mostrando {startIndex + 1} a {Math.min(endIndex, totalLogs)} de {totalLogs} logs</>
                  ) : (
                    "Nenhum log encontrado"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </UnitLayout>
  );
}
