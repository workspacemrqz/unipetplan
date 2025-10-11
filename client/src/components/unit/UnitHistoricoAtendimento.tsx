import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { FileText, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Types for guides data
interface GuideWithNetworkUnit {
  id: string;
  procedure: string;
  procedureName?: string;
  status: string;
  value?: string;
  createdAt?: string;
  updatedAt?: string;
  networkUnit?: {
    id: string;
    name: string;
  };
  clientName?: string;
  petName?: string;
  procedureNotes?: string;
  generalNotes?: string;
}

interface GuidesResponse {
  data: GuideWithNetworkUnit[];
  total: number;
  totalPages: number;
  page: number;
}

interface GroupedGuides {
  [date: string]: GuideWithNetworkUnit[];
}

export default function UnitHistoricoAtendimento({ unitSlug }: { unitSlug: string }) {
  const [selectedGuide, setSelectedGuide] = useState<GuideWithNetworkUnit | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: guides, isLoading, isError, error } = useQuery<GuidesResponse>({
    queryKey: [`/api/units/${unitSlug}/guides`, { page: '1', limit: '1000' }],
    queryFn: async () => {
      const token = localStorage.getItem('unit-token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await fetch(`/api/units/${unitSlug}/guides?page=1&limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token inválido ou expirado');
        }
        throw new Error(`Erro ao buscar histórico: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: !!unitSlug
  });

  const guidesData = guides?.data || [];

  // Agrupar guias por data
  const groupedGuides: GroupedGuides = guidesData.reduce((acc, guide) => {
    if (!guide.createdAt) return acc;
    
    const date = format(new Date(guide.createdAt), 'dd/MM/yyyy', { locale: ptBR });
    
    if (!acc[date]) {
      acc[date] = [];
    }
    
    acc[date].push(guide);
    return acc;
  }, {} as GroupedGuides);

  // Ordenar as datas de forma cronológica (mais recente primeiro)
  const sortedDates = Object.keys(groupedGuides).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('/').map(Number);
    const [dayB, monthB, yearB] = b.split('/').map(Number);
    const dateA = new Date(yearA || 0, (monthA || 1) - 1, dayA || 1);
    const dateB = new Date(yearB || 0, (monthB || 1) - 1, dayB || 1);
    return dateB.getTime() - dateA.getTime();
  });

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      'open': 'Aberto',
      'in_progress': 'Em andamento',
      'completed': 'Concluído',
      'cancelled': 'Cancelado'
    };
    return statusLabels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'open': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleViewDetails = (guide: GuideWithNetworkUnit) => {
    setSelectedGuide(guide);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Histórico de atendimento</h1>
          <p className="text-sm text-muted-foreground">Visualize todos os atendimentos organizados por data</p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando histórico...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-semibold mb-2">Erro ao carregar histórico</p>
            <p className="text-muted-foreground text-sm mb-4">
              {error?.message || 'Não foi possível carregar o histórico de atendimentos'}
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Tentar novamente
            </Button>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum atendimento encontrado</p>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date} className="bg-white border border-[#eaeaea] rounded-lg shadow-sm overflow-hidden">
              {/* Date Header */}
              <div className="bg-gradient-to-r from-[#277677] to-[#257273] px-6 py-4">
                <div className="flex items-center gap-2 text-white">
                  <Calendar className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">{date}</h2>
                  <span className="ml-auto text-sm opacity-90">
                    {groupedGuides[date]?.length || 0} {(groupedGuides[date]?.length || 0) === 1 ? 'atendimento' : 'atendimentos'}
                  </span>
                </div>
              </div>

              {/* Guides List */}
              <div className="divide-y divide-[#eaeaea]">
                {(groupedGuides[date] || []).map((guide) => (
                  <div key={guide.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {guide.procedure || guide.procedureName || 'Procedimento não informado'}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(guide.status)}`}>
                            {getStatusLabel(guide.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                          {guide.petName && (
                            <div>
                              <span className="font-medium">Pet:</span> {guide.petName}
                            </div>
                          )}
                          {guide.clientName && (
                            <div>
                              <span className="font-medium">Cliente:</span> {guide.clientName}
                            </div>
                          )}
                          {guide.value && (
                            <div>
                              <span className="font-medium">Valor:</span> R$ {guide.value}
                            </div>
                          )}
                          {guide.createdAt && (
                            <div>
                              <span className="font-medium">Horário:</span>{' '}
                              {format(new Date(guide.createdAt), 'HH:mm', { locale: ptBR })}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(guide)}
                        className="flex-shrink-0"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Exibir detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes do Atendimento
            </DialogTitle>
          </DialogHeader>
          
          {selectedGuide && (
            <div className="space-y-6">
              {/* Pet Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">Informações do Pet</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Nome do Pet</label>
                    <p className="font-medium">{selectedGuide.petName || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Cliente</label>
                    <p className="font-medium">{selectedGuide.clientName || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              {/* Procedure Information */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">Procedimento Realizado</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Nome do Procedimento</label>
                    <p className="font-medium">{selectedGuide.procedure || selectedGuide.procedureName || 'Não informado'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Status</label>
                      <p>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedGuide.status)}`}>
                          {getStatusLabel(selectedGuide.status)}
                        </span>
                      </p>
                    </div>
                    {selectedGuide.value && (
                      <div>
                        <label className="text-sm text-muted-foreground">Valor</label>
                        <p className="font-semibold text-green-600">R$ {selectedGuide.value}</p>
                      </div>
                    )}
                  </div>

                  {selectedGuide.procedureNotes && (
                    <div>
                      <label className="text-sm text-muted-foreground">Observações do Procedimento</label>
                      <p className="text-sm mt-1 bg-gray-50 p-3 rounded">{selectedGuide.procedureNotes}</p>
                    </div>
                  )}

                  {selectedGuide.generalNotes && (
                    <div>
                      <label className="text-sm text-muted-foreground">Observações Gerais</label>
                      <p className="text-sm mt-1 bg-gray-50 p-3 rounded">{selectedGuide.generalNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Information */}
              {selectedGuide.createdAt && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Informações de Data</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Data do Atendimento</label>
                      <p className="font-medium">
                        {format(new Date(selectedGuide.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {selectedGuide.networkUnit && (
                      <div>
                        <label className="text-sm text-muted-foreground">Unidade</label>
                        <p className="font-medium">{selectedGuide.networkUnit.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end items-center pt-4 border-t">
                <Button
                  variant="default"
                  onClick={() => setDetailsOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
