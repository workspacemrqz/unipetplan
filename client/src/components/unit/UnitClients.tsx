import { useState, useEffect } from 'react';
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/admin/ui/dialog";
import { Search, Eye, MoreHorizontal, FileText, ChevronLeft, ChevronRight, Copy, Check, Loader2, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin/ui/select";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { formatBrazilianPhoneForDisplay } from "@/hooks/use-site-settings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  sex: string;
  gender?: string;
  castrated?: boolean;
  color?: string;
  weight?: number;
  age?: string;
  birthDate?: string;
  microchip?: string;
  allergies?: string;
  previousDiseases?: string;
  surgeries?: string;
  currentMedications?: string;
  medications?: string;
  observations?: string;
  chronicConditions?: string;
  hereditaryConditions?: string;
  parasiteTreatments?: string;
  vaccineData?: any[];
  lastCheckup?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
  clientId: string;
}

interface Client {
  id: string;
  name?: string;
  fullName?: string;
  full_name?: string;
  cpf: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
  createdAt?: string;
  updatedAt?: string;
  pets?: Pet[];
}

const allColumns = [
  "Nome",
  "Telefone",
  "Email",
  "CPF",
  "Cidade",
  "Data",
  "Ações"
] as const;

export default function UnitClients({ unitSlug }: { unitSlug: string }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [currentPage, setCurrentPage] = useState(1);
  const [clientPets, setClientPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const { visibleColumns, toggleColumn } = useColumnPreferences('unit.clients.columns', allColumns);
  const pageSize = 10;
  const { toast } = useToast();

  // Guide creation states
  const [createGuideDialogOpen, setCreateGuideDialogOpen] = useState(false);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [guideFormData, setGuideFormData] = useState({
    clientId: "",
    petId: "",
    procedure: "",
    procedureNotes: "",
    generalNotes: "",
    coparticipacao: "",
    receber: ""
  });
  const [isSubmittingGuide, setIsSubmittingGuide] = useState(false);
  const [guidePets, setGuidePets] = useState<Pet[]>([]);

  useEffect(() => {
    fetchClients();
  }, [unitSlug]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchClients();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedClient) {
      fetchClientPets(selectedClient.id);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('unit-token');
      const response = await fetch(`/api/unit/${unitSlug}/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchClients = async () => {
    setSearchLoading(true);
    try {
      const token = localStorage.getItem('unit-token');
      const response = await fetch(`/api/unit/${unitSlug}/clients/search/${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchClientPets = async (clientId: string) => {
    setPetsLoading(true);
    try {
      const token = localStorage.getItem('unit-token');
      const response = await fetch(`/api/unit/${unitSlug}/clients/${clientId}/pets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClientPets(data);
      }
    } catch (error) {
      console.error('Erro ao buscar pets:', error);
    } finally {
      setPetsLoading(false);
    }
  };

  const loadProcedures = async () => {
    try {
      const token = localStorage.getItem('unit-token');
      const response = await fetch(`/api/unit/${unitSlug}/procedures`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProcedures(data);
      }
    } catch (error) {
      console.error('Erro ao carregar procedimentos:', error);
    }
  };

  const loadGuidePets = async (clientId: string) => {
    try {
      const token = localStorage.getItem('unit-token');
      const response = await fetch(`/api/unit/${unitSlug}/clients/${clientId}/pets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGuidePets(data);
      }
    } catch (error) {
      console.error('Erro ao carregar pets:', error);
    }
  };

  const handleOpenCreateGuideDialog = (clientId: string, petId: string) => {
    setGuideFormData({
      clientId,
      petId,
      procedure: "",
      procedureNotes: "",
      generalNotes: "",
      coparticipacao: "",
      receber: ""
    });
    loadProcedures();
    loadGuidePets(clientId);
    setDetailsOpen(false);
    setCreateGuideDialogOpen(true);
  };

  const handleCloseCreateGuideDialog = () => {
    setCreateGuideDialogOpen(false);
    setGuideFormData({
      clientId: "",
      petId: "",
      procedure: "",
      procedureNotes: "",
      generalNotes: "",
      coparticipacao: "",
      receber: ""
    });
    setGuidePets([]);
  };

  const handleCreateGuide = async () => {
    if (!guideFormData.clientId || !guideFormData.petId || !guideFormData.procedure) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingGuide(true);
    try {
      const token = localStorage.getItem('unit-token');
      const response = await fetch(`/api/units/${unitSlug}/guides`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(guideFormData)
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Guia criada com sucesso!",
        });
        handleCloseCreateGuideDialog();
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Erro ao criar guia.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão ao criar guia.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingGuide(false);
    }
  };


  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setDetailsOpen(true);
  };

  const generateClientText = () => {
    if (!selectedClient) return "";

    let text = "";
    
    // Cabeçalho
    text += "=".repeat(50) + "\n";
    text += "INFORMAÇÕES DO CLIENTE\n";
    text += "=".repeat(50) + "\n\n";

    // Informações Pessoais
    text += "INFORMAÇÕES PESSOAIS:\n";
    text += "-".repeat(25) + "\n";
    text += `Nome Completo: ${selectedClient.name || selectedClient.fullName || selectedClient.full_name}\n`;
    text += `Email: ${selectedClient.email || "Não informado"}\n`;
    text += `Telefone: ${formatBrazilianPhoneForDisplay(selectedClient.phone)}\n`;
    text += `CPF: ${selectedClient.cpf}\n\n`;

    // Informações de Localização
    text += "INFORMAÇÕES DE LOCALIZAÇÃO:\n";
    text += "-".repeat(30) + "\n";
    text += `Cidade: ${selectedClient.city || "Não informado"}\n`;
    text += `Estado: ${selectedClient.state || "Não informado"}\n`;
    text += `CEP: ${selectedClient.cep || "Não informado"}\n`;
    text += `Endereço: ${selectedClient.address || "Não informado"}\n\n`;

    // Informações do Cadastro
    text += "INFORMAÇÕES DO CADASTRO:\n";
    text += "-".repeat(25) + "\n";
    text += `Data de Cadastro: ${selectedClient.createdAt ? format(new Date(selectedClient.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Não informado"}\n`;
    if (selectedClient.updatedAt) {
      text += `Última Atualização: ${format(new Date(selectedClient.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
    }
    text += "\n";

    // Informações dos Pets
    if (clientPets.length > 0) {
      text += "=".repeat(50) + "\n";
      text += "INFORMAÇÕES DOS PETS\n";
      text += "=".repeat(50) + "\n\n";

      clientPets.forEach((pet, index) => {
        text += `PET ${index + 1}:\n`;
        text += "-".repeat(10) + "\n";
        text += `Nome: ${pet.name}\n`;
        text += `Espécie: ${pet.species === 'dog' ? 'Cachorro' : 'Gato'}\n`;
        text += `Raça: ${pet.breed || "Não informado"}\n`;
        text += `Sexo: ${pet.gender === 'male' ? 'Macho' : 'Fêmea'}\n`;
        text += `Peso: ${pet.weight ? `${pet.weight} kg` : "Não informado"}\n`;
        text += `Data de Nascimento: ${pet.birthDate ? format(new Date(pet.birthDate), "dd/MM/yyyy", { locale: ptBR }) : "Não informado"}\n`;
        text += `Microchip: ${pet.microchip || "Não informado"}\n`;
        
        if (pet.allergies) text += `Alergias: ${pet.allergies}\n`;
        if (pet.surgeries) text += `Cirurgias Anteriores: ${pet.surgeries}\n`;
        if (pet.medications) text += `Medicações: ${pet.medications}\n`;
        if (pet.observations) text += `Observações: ${pet.observations}\n`;
        if (pet.chronicConditions) text += `Condições Crônicas: ${pet.chronicConditions}\n`;
        if (pet.hereditaryConditions) text += `Condições Hereditárias: ${pet.hereditaryConditions}\n`;
        if (pet.parasiteTreatments) text += `Tratamentos Antiparasitários: ${pet.parasiteTreatments}\n`;
        
        if (pet.vaccineData && pet.vaccineData.length > 0) {
          text += "Vacinas:\n";
          pet.vaccineData.forEach((vaccine: any) => {
            text += `  - ${vaccine.vaccine}: ${format(new Date(vaccine.date), "dd/MM/yyyy", { locale: ptBR })}\n`;
          });
        }
        
        text += "\n";
      });
    }

    return text;
  };

  const handleCopyToClipboard = async () => {
    setCopyState('copying');
    
    try {
      const text = generateClientText();
      await navigator.clipboard.writeText(text);
      
      setCopyState('copied');
      toast({
        title: "Copiado!",
        description: "Informações do cliente copiadas para a área de transferência",
      });
      
      setTimeout(() => {
        setCopyState('idle');
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      setCopyState('idle');
      toast({
        title: "Erro",
        description: "Não foi possível copiar as informações",
        variant: "destructive"
      });
    }
  };

  const filteredClients = searchQuery.length >= 2 ? searchResults : clients;
  const totalClients = filteredClients.length;
  const totalPages = Math.ceil(totalClients / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayClients = filteredClients.slice(startIndex, endIndex);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Clientes & Pets</h1>
          <p className="text-sm text-muted-foreground">Gerencie os clientes e seus pets cadastrados</p>
        </div>
      </div>

      {/* Filters and Column Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
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
                {visibleColumns.includes("Nome") && <TableHead className="w-[200px] bg-white">Nome</TableHead>}
                {visibleColumns.includes("Telefone") && <TableHead className="w-[140px] bg-white">Telefone</TableHead>}
                {visibleColumns.includes("Email") && <TableHead className="w-[180px] bg-white">Email</TableHead>}
                {visibleColumns.includes("CPF") && <TableHead className="w-[120px] bg-white">CPF</TableHead>}
                {visibleColumns.includes("Cidade") && <TableHead className="w-[120px] bg-white">Cidade</TableHead>}
                {visibleColumns.includes("Data") && <TableHead className="w-[120px] bg-white">Data</TableHead>}
                {visibleColumns.includes("Ações") && <TableHead className="w-[200px] bg-white">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || searchLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={visibleColumns.length} className="text-center py-6">
                      <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : displayClients && displayClients.length > 0 ? (
                displayClients.map((client: Client) => (
                  <TableRow key={client.id} className="bg-white border-b border-[#eaeaea]">
                    {visibleColumns.includes("Nome") && (
                      <TableCell className="font-medium whitespace-nowrap bg-white">
                        {client.name || client.fullName || client.full_name}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Telefone") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {formatBrazilianPhoneForDisplay(client.phone)}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Email") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {client.email || "Não informado"}
                      </TableCell>
                    )}
                    {visibleColumns.includes("CPF") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {client.cpf}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Cidade") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {client.city || "Não informado"}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Data") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        {client.createdAt ? format(new Date(client.createdAt), "dd/MM/yyyy", { locale: ptBR }) : ""}
                      </TableCell>
                    )}
                    {visibleColumns.includes("Ações") && (
                      <TableCell className="whitespace-nowrap bg-white">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(client)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow className="bg-white border-b border-[#eaeaea]">
                  <TableCell colSpan={visibleColumns.length} className="text-center py-12 bg-white">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery.length > 0
                        ? "Nenhum cliente encontrado para a busca."
                        : "Nenhum cliente cadastrado ainda."
                      }
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalClients > 10 && (
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  {totalClients > 0 ? (
                    <>Mostrando {startIndex + 1} a {Math.min(endIndex, totalClients)} de {totalClients} clientes</>
                  ) : (
                    "Nenhum cliente encontrado"
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
              <span>Detalhes do Cliente</span>
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
          
          {selectedClient && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações Pessoais</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Nome Completo:</strong> <span className="text-foreground">{selectedClient.name || selectedClient.fullName || selectedClient.full_name}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Email:</strong> <span className="text-foreground">{selectedClient.email || "Não informado"}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Telefone:</strong> <span className="text-foreground">{formatBrazilianPhoneForDisplay(selectedClient.phone)}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">CPF:</strong> <span className="text-foreground">{selectedClient.cpf}</span></span>
                    </div>
                  </div>
                </div>

                {(selectedClient.city || selectedClient.state || selectedClient.cep || selectedClient.address) && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Informações de Localização</h4>
                    <div className="space-y-2 text-sm">
                      {selectedClient.city && (
                        <div className="flex items-center space-x-2">
                          <span><strong className="text-primary">Cidade:</strong> <span className="text-foreground">{selectedClient.city}</span></span>
                        </div>
                      )}
                      {selectedClient.state && (
                        <div className="flex items-center space-x-2">
                          <span><strong className="text-primary">Estado:</strong> <span className="text-foreground">{selectedClient.state}</span></span>
                        </div>
                      )}
                      {selectedClient.cep && (
                        <div className="flex items-center space-x-2">
                          <span><strong className="text-primary">CEP:</strong> <span className="text-foreground">{selectedClient.cep}</span></span>
                        </div>
                      )}
                      {selectedClient.address && (
                        <div className="flex items-start space-x-2">
                          <span><strong className="text-primary">Endereço:</strong> <span className="text-foreground">{selectedClient.address}</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações do Cadastro</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Data de Cadastro:</strong> <span className="text-foreground">{selectedClient.createdAt ? format(new Date(selectedClient.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Não informado"}</span></span>
                    </div>
                    {selectedClient.updatedAt && (
                      <div className="flex items-center space-x-2">
                        <span><strong className="text-primary">Última Atualização:</strong> <span className="text-foreground">{format(new Date(selectedClient.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pets Section */}
                {petsLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Carregando pets...</p>
                  </div>
                ) : clientPets && clientPets.length > 0 ? (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Pets ({clientPets.length})</h4>
                    <div className="space-y-3">
                      {clientPets.map((pet) => (
                        <div key={pet.id} className="border border-border rounded-lg p-3 bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-foreground">{pet.name}</h5>
                          </div>
                          
                          {/* Informações Básicas do Pet */}
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center space-x-2">
                              <span><strong className="text-primary">Espécie:</strong> <span className="text-foreground">{pet.species === 'dog' ? 'Cachorro' : 'Gato'}</span></span>
                            </div>
                            {pet.breed && (
                              <div className="flex items-center space-x-2">
                                <span><strong className="text-primary">Raça:</strong> <span className="text-foreground">{pet.breed}</span></span>
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <span><strong className="text-primary">Sexo:</strong> <span className="text-foreground">{pet.sex === 'male' ? 'Macho' : 'Fêmea'}</span></span>
                            </div>
                            {pet.castrated !== undefined && (
                              <div className="flex items-center space-x-2">
                                <span><strong className="text-primary">Castrado:</strong> <span className="text-foreground">{pet.castrated ? 'Sim' : 'Não'}</span></span>
                              </div>
                            )}
                            {pet.color && (
                              <div className="flex items-center space-x-2">
                                <span><strong className="text-primary">Cor:</strong> <span className="text-foreground">{pet.color}</span></span>
                              </div>
                            )}
                            {pet.weight && (
                              <div className="flex items-center space-x-2">
                                <span><strong className="text-primary">Peso:</strong> <span className="text-foreground">{pet.weight} kg</span></span>
                              </div>
                            )}
                            {pet.age && (
                              <div className="flex items-center space-x-2">
                                <span><strong className="text-primary">Idade:</strong> <span className="text-foreground">{pet.age}</span></span>
                              </div>
                            )}
                            {pet.birthDate && (
                              <div className="flex items-center space-x-2">
                                <span><strong className="text-primary">Data de Nascimento:</strong> <span className="text-foreground">{format(new Date(pet.birthDate), "dd/MM/yyyy", { locale: ptBR })}</span></span>
                              </div>
                            )}
                            {pet.microchip && (
                              <div className="flex items-center space-x-2">
                                <span><strong className="text-primary">Microchip:</strong> <span className="text-foreground">{pet.microchip}</span></span>
                              </div>
                            )}
                            {pet.lastCheckup && (
                              <div className="flex items-center space-x-2">
                                <span><strong className="text-primary">Última Consulta:</strong> <span className="text-foreground">{format(new Date(pet.lastCheckup), "dd/MM/yyyy", { locale: ptBR })}</span></span>
                              </div>
                            )}
                          </div>

                          {/* Informações Médicas */}
                          {(pet.allergies || pet.surgeries || pet.currentMedications || pet.previousDiseases || pet.observations || pet.chronicConditions || pet.hereditaryConditions || pet.parasiteTreatments) && (
                            <div className="mt-3 pt-2 border-t border-border">
                              <h5 className="font-medium text-foreground mb-2">Informações Médicas</h5>
                              <div className="space-y-1 text-sm">
                                {pet.allergies && (
                                  <div className="flex items-start space-x-2">
                                    <span><strong className="text-primary">Alergias:</strong> <span className="text-foreground">{pet.allergies}</span></span>
                                  </div>
                                )}
                                {pet.previousDiseases && (
                                  <div className="flex items-start space-x-2">
                                    <span><strong className="text-primary">Doenças Anteriores:</strong> <span className="text-foreground">{pet.previousDiseases}</span></span>
                                  </div>
                                )}
                                {pet.surgeries && (
                                  <div className="flex items-start space-x-2">
                                    <span><strong className="text-primary">Cirurgias Anteriores:</strong> <span className="text-foreground">{pet.surgeries}</span></span>
                                  </div>
                                )}
                                {pet.currentMedications && (
                                  <div className="flex items-start space-x-2">
                                    <span><strong className="text-primary">Medicações Atuais:</strong> <span className="text-foreground">{pet.currentMedications}</span></span>
                                  </div>
                                )}
                                {pet.observations && (
                                  <div className="flex items-start space-x-2">
                                    <span><strong className="text-primary">Observações:</strong> <span className="text-foreground">{pet.observations}</span></span>
                                  </div>
                                )}
                                {pet.chronicConditions && (
                                  <div className="flex items-start space-x-2">
                                    <span><strong className="text-primary">Condições Crônicas:</strong> <span className="text-foreground">{pet.chronicConditions}</span></span>
                                  </div>
                                )}
                                {pet.hereditaryConditions && (
                                  <div className="flex items-start space-x-2">
                                    <span><strong className="text-primary">Condições Hereditárias:</strong> <span className="text-foreground">{pet.hereditaryConditions}</span></span>
                                  </div>
                                )}
                                {pet.parasiteTreatments && (
                                  <div className="flex items-start space-x-2">
                                    <span><strong className="text-primary">Tratamentos Antiparasitários:</strong> <span className="text-foreground">{pet.parasiteTreatments}</span></span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Dados de Vacinação */}
                          {pet.vaccineData && pet.vaccineData.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-border">
                              <h5 className="font-medium text-foreground mb-2">Vacinas</h5>
                              <div className="space-y-1 text-sm">
                                {pet.vaccineData.map((vaccine: any, index: number) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <span><strong className="text-primary">{vaccine.vaccine}:</strong> <span className="text-foreground">{format(new Date(vaccine.date), "dd/MM/yyyy", { locale: ptBR })}</span></span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Informações do Cadastro do Pet */}
                          <div className="mt-3 pt-2 border-t border-border">
                            <h5 className="font-medium text-foreground mb-2">Informações do Cadastro</h5>
                            <div className="space-y-1 text-sm">
                              {pet.isActive !== undefined && (
                                <div className="flex items-center space-x-2">
                                  <span><strong className="text-primary">Status:</strong> <span className="text-foreground">{pet.isActive ? 'Ativo' : 'Inativo'}</span></span>
                                </div>
                              )}
                              {pet.createdAt && (
                                <div className="flex items-center space-x-2">
                                  <span><strong className="text-primary">Data de Cadastro:</strong> <span className="text-foreground">{format(new Date(pet.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></span>
                                </div>
                              )}
                              {pet.updatedAt && (
                                <div className="flex items-center space-x-2">
                                  <span><strong className="text-primary">Última Atualização:</strong> <span className="text-foreground">{format(new Date(pet.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Botão de Ação do Pet */}
                          <div className="mt-3 pt-2 border-t border-border">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleOpenCreateGuideDialog(selectedClient.id, pet.id)}
                                className="text-xs font-semibold px-4 py-2 rounded-md transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-teal-500/25 flex items-center"
                                style={{
                                  background: 'var(--btn-ver-planos-bg)',
                                  color: 'var(--btn-ver-planos-text)',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Nova Guia
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum pet cadastrado</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Guide Dialog */}
      <Dialog open={createGuideDialogOpen} onOpenChange={setCreateGuideDialogOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[85vh]" hideCloseButton={true}>
          <DialogHeader>
            <DialogTitle>
              Nova Guia de Atendimento
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cliente *</label>
                <Select value={guideFormData.clientId} onValueChange={(value) => {
                  setGuideFormData({ ...guideFormData, clientId: value, petId: "" });
                  loadGuidePets(value);
                }} disabled>
                  <SelectTrigger className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.fullName || client.full_name || client.name} - {client.cpf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Pet *</label>
                <Select value={guideFormData.petId} onValueChange={(value) => {
                  setGuideFormData({ ...guideFormData, petId: value });
                }} disabled>
                  <SelectTrigger className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start">
                    <SelectValue placeholder="Selecione um pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {guidePets.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Procedimento *</label>
              <Select value={guideFormData.procedure} onValueChange={(value) => {
                const selectedProcedure = procedures.find(p => p.name === value);
                setGuideFormData({ 
                  ...guideFormData, 
                  procedure: value,
                  coparticipacao: selectedProcedure?.coparticipacao?.toString() || "0",
                  receber: selectedProcedure?.payValue?.toString() || selectedProcedure?.price?.toString() || "0"
                });
              }}>
                <SelectTrigger className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start">
                  <SelectValue placeholder="Selecione um procedimento" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((proc) => (
                    <SelectItem key={proc.id} value={proc.name}>
                      {proc.name} - R$ {proc.price ? proc.price.toFixed(2) : '0.00'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Coparticipação (R$)</label>
                <Input
                  type="text"
                  value={guideFormData.coparticipacao}
                  onChange={(e) => setGuideFormData({ ...guideFormData, coparticipacao: e.target.value })}
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Receber (R$)</label>
                <Input
                  type="text"
                  value={guideFormData.receber}
                  onChange={(e) => setGuideFormData({ ...guideFormData, receber: e.target.value })}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notas do Procedimento</label>
              <textarea
                className="w-full p-2 border rounded-md min-h-[80px]"
                value={guideFormData.procedureNotes}
                onChange={(e) => setGuideFormData({ ...guideFormData, procedureNotes: e.target.value })}
                placeholder="Adicione observações sobre o procedimento..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notas Gerais</label>
              <textarea
                className="w-full p-2 border rounded-md min-h-[80px]"
                value={guideFormData.generalNotes}
                onChange={(e) => setGuideFormData({ ...guideFormData, generalNotes: e.target.value })}
                placeholder="Adicione observações gerais..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseCreateGuideDialog}>
                Cancelar
              </Button>
              <Button onClick={handleCreateGuide} disabled={isSubmittingGuide}>
                {isSubmittingGuide ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Guia
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}