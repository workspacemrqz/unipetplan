import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import UnitLayout from "@/components/unit/UnitLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { FileText } from "lucide-react";
import LoadingDots from "@/components/ui/LoadingDots";

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

export default function LogsPage() {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);

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

  const { data: logs = [], isLoading: isLoadingLogs } = useQuery<Log[]>({
    queryKey: [`/api/units/${slug}/logs`],
    enabled: !loading,
    queryFn: async () => {
      const token = getAuthToken();
      
      if (!token) {
        throw new Error("Token não encontrado");
      }

      const response = await fetch(`/api/units/${slug}/logs`, {
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

  const getUserLabel = (log: Log): string => {
    if (log.log.userType === "unit") {
      return "Admin";
    } else if (log.log.userType === "veterinarian" && log.veterinarian) {
      return log.veterinarian.name;
    }
    return log.log.userType;
  };

  const formatActionData = (actionData: any): string => {
    if (!actionData) return "-";
    
    try {
      if (typeof actionData === 'object') {
        // Format object as readable string
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

  return (
    <UnitLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-[#0e7074]" />
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">
                Logs de Ações
              </h1>
              <p className="text-sm text-muted-foreground">
                Registro de ações realizadas na criação de atendimentos
              </p>
            </div>
          </div>
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
                  <TableHead>Tipo de Ação</TableHead>
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
                      {formatActionData(logEntry.log.actionData)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </UnitLayout>
  );
}
