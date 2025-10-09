import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Badge } from "@/components/admin/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu";
import { Search, Eye, MoreHorizontal, ChevronLeft, ChevronRight, Star, Copy, Check, Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SatisfactionSurvey {
  id: string;
  clientName: string;
  clientEmail: string;
  rating: number;
  feedback: string | null;
  suggestions: string | null;
  wouldRecommend: boolean | null;
  respondedAt: string;
  createdAt: string;
  contractNumber?: string;
  serviceName?: string;
  protocolSubject?: string;
}

const allColumns = [
  "Cliente",
  "Avaliação",
  "Recomendaria",
  "Data",
  "Tipo",
  "Ações",
] as const;


export default function Evaluations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSurvey, setSelectedSurvey] = useState<SatisfactionSurvey | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const { visibleColumns, toggleColumn } = useColumnPreferences('evaluations.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();

  const { data: surveys = [], isLoading } = useQuery<SatisfactionSurvey[]>({
    queryKey: ["/admin/api/satisfaction-surveys"],
  });

  const filteredSurveys = searchQuery
    ? surveys.filter(
        (survey) =>
          survey.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          survey.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (survey.feedback && survey.feedback.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : surveys;

  const totalSurveys = filteredSurveys.length;
  const totalPages = Math.ceil(totalSurveys / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displaySurveys = filteredSurveys.slice(startIndex, endIndex);

  const handleViewDetails = (survey: SatisfactionSurvey) => {
    setSelectedSurvey(survey);
    setDetailsOpen(true);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getSurveyType = (survey: SatisfactionSurvey) => {
    if (survey.contractNumber) return `Contrato ${survey.contractNumber}`;
    if (survey.serviceName) return survey.serviceName;
    if (survey.protocolSubject) return `Protocolo: ${survey.protocolSubject}`;
    return "Geral";
  };

  const generateSurveyText = () => {
    if (!selectedSurvey) return "";
    
    let text = "DETALHES DA AVALIAÇÃO\n";
    text += "=".repeat(50) + "\n\n";
    
    text += `Cliente: ${selectedSurvey.clientName}\n`;
    text += `Email: ${selectedSurvey.clientEmail}\n`;
    text += `Avaliação: ${selectedSurvey.rating} estrela(s)\n`;
    text += `Recomendaria: ${selectedSurvey.wouldRecommend === true ? "Sim" : selectedSurvey.wouldRecommend === false ? "Não" : "Não informado"}\n`;
    text += `Tipo: ${getSurveyType(selectedSurvey)}\n`;
    text += `Data: ${format(new Date(selectedSurvey.respondedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n\n`;
    
    if (selectedSurvey.feedback) {
      text += `Feedback:\n${selectedSurvey.feedback}\n\n`;
    }
    
    if (selectedSurvey.suggestions) {
      text += `Sugestões:\n${selectedSurvey.suggestions}\n\n`;
    }
    
    text += "=".repeat(50);
    
    return text;
  };

  const handleCopyToClipboard = async () => {
    if (copyState !== 'idle') return;
    
    try {
      setCopyState('copying');
      const text = generateSurveyText();
      await navigator.clipboard.writeText(text);
      
      setCopyState('copied');
      
      setTimeout(() => {
        setCopyState('idle');
      }, 2000);
    } catch (error) {
      setCopyState('idle');
      toast({
        title: "Erro",
        description: "Não foi possível copiar as informações. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const calculateAverageRating = () => {
    if (surveys.length === 0) return 0;
    const sum = surveys.reduce((acc, survey) => acc + survey.rating, 0);
    return (sum / surveys.length).toFixed(1);
  };

  const calculateRecommendationRate = () => {
    const withRecommendation = surveys.filter(s => s.wouldRecommend !== null);
    if (withRecommendation.length === 0) return 0;
    const wouldRecommend = withRecommendation.filter(s => s.wouldRecommend === true).length;
    return ((wouldRecommend / withRecommendation.length) * 100).toFixed(0);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Avaliações</h1>
          <p className="text-sm text-muted-foreground">Feedback e pesquisas de satisfação dos clientes</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-[#eaeaea] rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Avaliações</p>
              <p className="text-2xl font-bold text-foreground">{surveys.length}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div className="border border-[#eaeaea] rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Média de Avaliação</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-foreground">{calculateAverageRating()}</p>
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
            <Star className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div className="border border-[#eaeaea] rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Recomendação</p>
              <p className="text-2xl font-bold text-foreground">{calculateRecommendationRate()}%</p>
            </div>
            <Star className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Filters and Column Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 w-80"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                style={{
                  borderColor: 'var(--border-gray)',
                  background: 'white'
                }}
              >
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {allColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={visibleColumns.includes(col)}
                  onCheckedChange={() => toggleColumn(col)}
                  className="mb-1"
                >
                  {col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Modern Table Container */}
      <div className="container my-10 space-y-4 border border-[#eaeaea] rounded-lg bg-white shadow-sm">
        {/* Table */}
        <div className="rounded-lg overflow-hidden">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-white border-b border-[#eaeaea]">
                {visibleColumns.includes("Cliente") && <TableHead className="w-[200px] bg-white">Cliente</TableHead>}
                {visibleColumns.includes("Avaliação") && <TableHead className="w-[140px] bg-white">Avaliação</TableHead>}
                {visibleColumns.includes("Recomendaria") && <TableHead className="w-[140px] bg-white">Recomendaria</TableHead>}
                {visibleColumns.includes("Data") && <TableHead className="w-[140px] bg-white">Data</TableHead>}
                {visibleColumns.includes("Tipo") && <TableHead className="w-[180px] bg-white">Tipo</TableHead>}
                {visibleColumns.includes("Ações") && <TableHead className="w-[100px] bg-white">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={visibleColumns.length} className="text-center py-6">
                      <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : displaySurveys && displaySurveys.length > 0 ? (
                displaySurveys.map((survey: SatisfactionSurvey) => (
                  <TableRow key={survey.id} className="bg-white border-b border-[#eaeaea]">
                    {visibleColumns.includes("Cliente") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <div>
                          <div className="font-medium">{survey.clientName}</div>
                          <div className="text-sm text-muted-foreground">{survey.clientEmail}</div>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("Avaliação") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {renderStars(survey.rating)}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Recomendaria") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <Badge className={cn("whitespace-nowrap", "border border-border rounded-lg bg-background text-foreground")}>
                          {survey.wouldRecommend === true ? "Sim" : survey.wouldRecommend === false ? "Não" : "N/A"}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("Data") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {format(new Date(survey.respondedAt), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Tipo") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {getSurveyType(survey)}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Ações") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(survey)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow className="bg-white border-b border-[#eaeaea]">
                  <TableCell colSpan={visibleColumns.length} className="text-center py-12 bg-white">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "Nenhuma avaliação encontrada para a busca."
                        : "Nenhuma avaliação registrada ainda."
                      }
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalSurveys > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalSurveys > 0 ? (
                    <>Mostrando {startIndex + 1} a {Math.min(endIndex, totalSurveys)} de {totalSurveys} avaliações</>
                  ) : (
                    "Nenhuma avaliação encontrada"
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

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent hideCloseButton>
          <DialogHeader className="flex flex-row items-center justify-between pr-2">
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-primary" />
              <span>Detalhes da Avaliação</span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={copyState === 'copying'}
                className={`gap-2 h-8 transition-all duration-300 ${
                  copyState === 'copied' ? 'bg-[#e6f4f4] border-[#277677] text-[#277677]' : ''
                }`}
              >
                {copyState === 'copying' && <Loader2 className="h-4 w-4 animate-spin" />}
                {copyState === 'copied' && <Check className="h-4 w-4" />}
                {copyState === 'idle' && <Copy className="h-4 w-4" />}
                {copyState === 'copying' ? 'Copiando...' : copyState === 'copied' ? 'Copiado!' : 'Copiar'}
              </Button>
              <Button
                variant="outline" 
                onClick={() => setDetailsOpen(false)}
                className="h-8"
              >
                Fechar
              </Button>
            </div>
          </DialogHeader>
          
          {selectedSurvey && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações do Cliente</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Nome:</strong> <span className="text-foreground">{selectedSurvey.clientName}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Email:</strong> <span className="text-foreground">{selectedSurvey.clientEmail}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Data:</strong> <span className="text-foreground">{format(new Date(selectedSurvey.respondedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Tipo:</strong> <span className="text-foreground">{getSurveyType(selectedSurvey)}</span></span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Avaliação</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Estrelas:</strong></span>
                      {renderStars(selectedSurvey.rating)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Recomendaria:</strong> <Badge className={cn("whitespace-nowrap", "border border-border rounded-lg bg-background text-foreground")}>{selectedSurvey.wouldRecommend === true ? "Sim" : selectedSurvey.wouldRecommend === false ? "Não" : "Não informado"}</Badge></span>
                    </div>
                  </div>
                </div>

                {selectedSurvey.feedback && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Feedback</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedSurvey.feedback}</p>
                    </div>
                  </div>
                )}

                {selectedSurvey.suggestions && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Sugestões</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedSurvey.suggestions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
