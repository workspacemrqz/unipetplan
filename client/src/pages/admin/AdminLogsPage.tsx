import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDate } from "@internationalized/date";
import { Button } from "@/components/admin/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { Separator } from "@/components/admin/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { ChevronLeft, ChevronRight, File } from "lucide-react";
import { DateFilterComponent } from "@/components/admin/DateFilterComponent";

// Action type translations
const actionTypeTranslations: Record<string, string> = {
  "created": "Criado",
  "updated": "Atualizado",
  "deleted": "Excluído",
  "viewed": "Visualizado",
  // Unit action types
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

// Entity type translations
const entityTypeTranslations: Record<string, string> = {
  "client": "Cliente",
  "contract": "Contrato",
  "plan": "Plano",
  "procedure": "Procedimento",
  "coupon": "Cupom",
  "network_unit": "Unidade da Rede",
  "user": "Usuário",
  "seller": "Vendedor",
};

const getEntityTypeLabel = (entityType: string): string => {
  return entityTypeTranslations[entityType] || entityType;
};

interface AdminActionLog {
  id: string;
  adminUserId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  metadata: any;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date | string;
}

interface UnitActionLog {
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
  networkUnit: {
    id: string;
    name: string;
  } | null;
}

interface LogsResponse {
  data: (AdminActionLog | UnitActionLog)[];
  total: number;
  totalPages: number;
  page: number;
}

export default function AdminLogsPage() {
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<"admin" | "units">("admin");
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

  const handleDateRangeChange = (startDate: CalendarDate | null, endDate: CalendarDate | null) => {
    setDateFilter({ startDate, endDate });
    setCurrentPage(1);
  };

  // Get date range params for the query
  const getDateRangeParams = (startDate: CalendarDate | null, endDate: CalendarDate | null) => {
    const params: { startDate?: string; endDate?: string } = {};
    
    if (startDate) {
      const start = new Date(startDate.year, startDate.month - 1, startDate.day);
      params.startDate = start.toISOString();
    }
    
    if (endDate) {
      const end = new Date(endDate.year, endDate.month - 1, endDate.day);
      end.setHours(23, 59, 59, 999);
      params.endDate = end.toISOString();
    }
    
    return params;
  };

  const dateParams = getDateRangeParams(debouncedDateFilter.startDate, debouncedDateFilter.endDate);

  // Construct query parameters
  const queryParams = {
    page: currentPage.toString(),
    limit: pageSize.toString(),
    source: sourceFilter,
    ...(sourceFilter === "admin" && actionTypeFilter !== "all" && { actionType: actionTypeFilter }),
    ...(sourceFilter === "admin" && entityTypeFilter !== "all" && { entityType: entityTypeFilter }),
    ...(sourceFilter === "units" && userTypeFilter !== "all" && { userType: userTypeFilter }),
    ...dateParams
  };

  const { data: logsResponse, isLoading } = useQuery<LogsResponse>({
    queryKey: ["/admin/api/logs", queryParams],
    queryFn: async () => {
      const params = new URLSearchParams(queryParams);
      const response = await fetch(`/admin/api/logs?${params}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar logs');
      }

      return response.json();
    },
  });

  const logs = logsResponse?.data || [];
  const totalLogs = logsResponse?.total || 0;
  const totalPages = logsResponse?.totalPages || 0;

  const formatMetadata = (metadata: any): string => {
    if (!metadata) return "-";
    
    try {
      // Format metadata to show key details
      if (typeof metadata === 'object') {
        const keys = Object.keys(metadata);
        if (keys.length === 0) return "-";
        
        // Show first few key-value pairs
        const preview = keys.slice(0, 2).map(key => {
          const value = metadata[key];
          if (typeof value === 'object') return `${key}: {...}`;
          return `${key}: ${value}`;
        }).join(', ');
        
        return keys.length > 2 ? `${preview}, ...` : preview;
      }
      
      return String(metadata);
    } catch {
      return "-";
    }
  };

  const formatUnitActionData = (actionType: string, actionData: any): string => {
    if (!actionData) return "-";
    
    try {
      switch (actionType) {
        case "client_selected":
          return actionData.clientName || actionData.name || actionData.cpf || "-";
        case "pet_selected":
          return actionData.petName || actionData.name || "-";
        case "procedure_added":
          return `${actionData.procedureName || actionData.name || "Procedimento"} ${actionData.value ? `- R$ ${actionData.value}` : ""}`;
        case "atendimento_created":
          return "Atendimento finalizado";
        case "veterinarian_created":
        case "veterinarian_updated":
        case "veterinarian_deleted":
          return actionData.name || "-";
        case "veterinarian_status_changed":
          return `${actionData.name}: ${actionData.oldStatus} → ${actionData.newStatus}`;
        default:
          return formatMetadata(actionData);
      }
    } catch {
      return "-";
    }
  };

  const isUnitLog = (log: any): log is UnitActionLog => {
    return log && typeof log === 'object' && 'log' in log && log.log && 'actionType' in log.log;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Logs de Ações</h1>
          <p className="text-sm text-muted-foreground">Histórico de ações administrativas no sistema</p>
        </div>
      </div>

      {/* Date Filter */}
      <DateFilterComponent 
        onDateRangeChange={handleDateRangeChange}
        isLoading={isLoading ||
          (dateFilter.startDate !== debouncedDateFilter.startDate ||
            dateFilter.endDate !== debouncedDateFilter.endDate)}
        initialRange={dateFilter}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select 
          value={sourceFilter} 
          onValueChange={(value: "admin" | "units") => {
            setSourceFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger 
            className="w-48 [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
            style={{
              borderColor: 'var(--border-gray)',
              background: 'white'
            }}
          >
            <SelectValue placeholder="Fonte dos logs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin" className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
              Logs Administrativos
            </SelectItem>
            <Separator />
            <SelectItem value="units" className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
              Logs de Unidades
            </SelectItem>
          </SelectContent>
        </Select>

        {sourceFilter === "admin" ? (
          <>
            <Select 
              value={actionTypeFilter} 
              onValueChange={(value) => {
                setActionTypeFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger 
                className="w-48 [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                style={{
                  borderColor: 'var(--border-gray)',
                  background: 'white'
                }}
              >
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: "all", label: "Todas as ações" },
                  { value: "created", label: "Criado" },
                  { value: "updated", label: "Atualizado" },
                  { value: "deleted", label: "Excluído" },
                  { value: "viewed", label: "Visualizado" }
                ].flatMap((action, index, array) => [
                  <SelectItem key={action.value} value={action.value} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                    {action.label}
                  </SelectItem>,
                  ...(index < array.length - 1 ? [<Separator key={`separator-${action.value}`} />] : [])
                ])}
              </SelectContent>
            </Select>

            <Select 
              value={entityTypeFilter} 
              onValueChange={(value) => {
                setEntityTypeFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger 
                className="w-48 [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                style={{
                  borderColor: 'var(--border-gray)',
                  background: 'white'
                }}
              >
                <SelectValue placeholder="Filtrar por entidade" />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: "all", label: "Todas as entidades" },
                  { value: "client", label: "Cliente" },
                  { value: "contract", label: "Contrato" },
                  { value: "plan", label: "Plano" },
                  { value: "procedure", label: "Procedimento" },
                  { value: "coupon", label: "Cupom" },
                  { value: "network_unit", label: "Unidade da Rede" },
                  { value: "user", label: "Usuário" },
                  { value: "seller", label: "Vendedor" }
                ].flatMap((entity, index, array) => [
                  <SelectItem key={entity.value} value={entity.value} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                    {entity.label}
                  </SelectItem>,
                  ...(index < array.length - 1 ? [<Separator key={`separator-${entity.value}`} />] : [])
                ])}
              </SelectContent>
            </Select>
          </>
        ) : (
          <Select 
            value={userTypeFilter} 
            onValueChange={(value) => {
              setUserTypeFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger 
              className="w-48 [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
              style={{
                borderColor: 'var(--border-gray)',
                background: 'white'
              }}
            >
              <SelectValue placeholder="Filtrar por usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                Todos
              </SelectItem>
              <Separator />
              <SelectItem value="unit" className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                Admin da Unidade
              </SelectItem>
              <Separator />
              <SelectItem value="veterinarian" className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                Veterinários
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Modern Table Container */}
      <div className="container my-10 space-y-4 border border-[#eaeaea] rounded-lg bg-white shadow-sm">
        {/* Table */}
        <div className="rounded-lg overflow-hidden">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-white border-b border-[#eaeaea]">
                <TableHead className="w-[180px] bg-white">Data/Hora</TableHead>
                {sourceFilter === "admin" ? (
                  <>
                    <TableHead className="w-[120px] bg-white">Admin</TableHead>
                    <TableHead className="w-[120px] bg-white">Tipo de Ação</TableHead>
                    <TableHead className="w-[150px] bg-white">Entidade</TableHead>
                    <TableHead className="w-[120px] bg-white">ID Entidade</TableHead>
                    <TableHead className="bg-white">Detalhes</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="w-[150px] bg-white">Unidade</TableHead>
                    <TableHead className="w-[120px] bg-white">Usuário</TableHead>
                    <TableHead className="w-[150px] bg-white">Tipo de Ação</TableHead>
                    <TableHead className="bg-white">Detalhes</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={sourceFilter === "admin" ? 6 : 5} className="text-center py-6">
                      <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : logs && logs.length > 0 ? (
                logs.map((log: any) => {
                  if (sourceFilter === "units" && isUnitLog(log)) {
                    // Unit log
                    return (
                      <TableRow key={log.log.id} className="bg-white border-b border-[#eaeaea]">
                        <TableCell className="whitespace-nowrap bg-white">
                          {format(new Date(log.log.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap bg-white">
                          {log.networkUnit?.name || "N/A"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap bg-white">
                          {log.log.userType === "unit" ? "Admin" : log.veterinarian?.name || "Veterinário"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap bg-white">
                          {getActionTypeLabel(log.log.actionType)}
                        </TableCell>
                        <TableCell className="bg-white">
                          <div className="text-sm text-muted-foreground truncate max-w-md">
                            {formatUnitActionData(log.log.actionType, log.log.actionData)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  } else {
                    // Admin log
                    const adminLog = log as AdminActionLog;
                    return (
                      <TableRow key={adminLog.id} className="bg-white border-b border-[#eaeaea]">
                        <TableCell className="whitespace-nowrap bg-white">
                          {format(new Date(adminLog.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap bg-white">
                          {adminLog.adminUserId || "N/A"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap bg-white">
                          {getActionTypeLabel(adminLog.actionType)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap bg-white">
                          {getEntityTypeLabel(adminLog.entityType)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap bg-white font-mono text-xs">
                          {adminLog.entityId.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="bg-white">
                          <div className="text-sm text-muted-foreground truncate max-w-md">
                            {formatMetadata(adminLog.metadata)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                })
              ) : (
                <TableRow className="bg-white border-b border-[#eaeaea]">
                  <TableCell colSpan={sourceFilter === "admin" ? 6 : 5} className="text-center py-12 bg-white">
                    <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum log encontrado para os filtros selecionados.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalLogs > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalLogs > 0 ? (
                    <>Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalLogs)} de {totalLogs} logs</>
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
                variant="admin-action"
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
    </div>
  );
}
