import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
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
import { useLocation } from "wouter";
import { Plus, Search, Edit, Eye, Copy, FileText, MoreHorizontal, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/admin/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getQueryOptions } from "@/lib/admin/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useColumnPreferences } from "@/hooks/admin/use-column-preferences";
import { formatBrazilianPhoneForDisplay } from "@/hooks/use-site-settings";
import { useAdminLogger } from "@/hooks/admin/use-admin-logger";
import { ExportButton } from "@/components/admin/ExportButton";
import { usePermissions } from "@/hooks/use-permissions";
import { capitalizeFirst } from "@/lib/utils";

// Interfaces
interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  gender?: string;
  sex?: string;
  age?: string;
  color?: string;
  castrated?: boolean;
  weight?: number;
  birthDate?: string;
  lastCheckup?: string;
  microchip?: string;
  allergies?: string;
  surgeries?: string;
  medications?: string;
  previousDiseases?: string;
  currentMedications?: string;
  observations?: string;
  chronicConditions?: string;
  hereditaryConditions?: string;
  parasiteTreatments?: string;
  vaccineData?: any[];
  createdAt: string;
  updatedAt?: string;
  clientId: string;
}

interface Client {
  id: string;
  fullName: string;
  full_name?: string;
  cpf: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
  createdAt: string;
  updatedAt?: string;
  createdByUnitId?: string;
  createdByUnitName?: string;
  pets?: Pet[];
  petCount?: number;
}

// Componente do ícone de adicionar pet
const AddPetIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    height="24px" 
    viewBox="0 -960 960 960" 
    width="24px" 
    fill="currentColor"
    className={className}
  >
    <path d="M180-475q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm180-160q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm240 0q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm180 160q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM266-75q-45 0-75.5-34.5T160-191q0-52 35.5-91t70.5-77q29-31 50-67.5t50-68.5q22-26 51-43t63-17q34 0 63 16t51 42q28 32 49.5 69t50.5 69q35 38 70.5 77t35.5 91q0 47-30.5 81.5T694-75q-54 0-107-9t-107-9q-54 0-107 9t-107 9Z"/>
  </svg>
);

const allColumns = [
  "Nome",
  "Telefone",
  "Email",
  "CPF",
  "Cidade",
  "Data",
  "Ações",
] as const;

export default function Clients() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const { visibleColumns, toggleColumn } = useColumnPreferences('clients.columns', allColumns);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();
  const { logAction } = useAdminLogger();
  const { canAdd, canEdit } = usePermissions();

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/admin/api/clients"],
    ...getQueryOptions('clients'),
  });

  const { data: searchResults = [], isLoading: searchLoading } = useQuery<Client[]>({
    queryKey: ["/admin/api/clients/search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const response = await fetch(`/admin/api/clients/search/${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Erro ao buscar clientes');
      return response.json();
    },
    enabled: searchQuery.length >= 2,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Calculate filtered and paginated clients first
  const filteredClients = (searchQuery.length >= 2 ? searchResults : clients)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalClients = filteredClients.length;
  const totalPages = Math.ceil(totalClients / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayClients = filteredClients.slice(startIndex, endIndex);

  // DESABILITADO: Prefetching de pets causava múltiplas requisições desnecessárias
  // Pets agora são carregados on-demand quando o modal é aberto
  // useEffect(() => {
  //   if (clients.length > 0 && !isLoading && displayClients.length > 0) {
  //     const prefetchTimer = setTimeout(() => {
  //       const clientIds = displayClients.map(client => client.id);
  //       console.log(`📋 [PREFETCH] Prefetching pets for ${clientIds.length} visible clients`);
  //       cacheManager.prefetchClientsPetsData(clientIds, 2).catch(error => {
  //         console.warn("⚠️ [PREFETCH] Client pets prefetch failed:", error);
  //       });
  //     }, 800);
  //     return () => clearTimeout(prefetchTimer);
  //   }
  // }, [clients, currentPage, searchQuery, isLoading, cacheManager]);

  // Query para buscar pets do cliente selecionado
  const { data: clientPets = [], isLoading: petsLoading } = useQuery<Pet[]>({
    queryKey: ["/admin/api/clients", selectedClient?.id, "pets"],
    enabled: !!selectedClient?.id,
    ...getQueryOptions('pets'),
  });


  const handleViewDetails = async (client: Client) => {
    setSelectedClient(client);
    setDetailsOpen(true);
    
    // Log da ação administrativa
    await logAction({
      actionType: "viewed",
      entityType: "client",
      entityId: client.id,
      metadata: { 
        name: client.fullName || client.full_name, 
        cpf: client.cpf 
      }
    });
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
    text += `Nome Completo: ${capitalizeFirst(selectedClient.fullName)}\n`;
    text += `Email: ${selectedClient.email || "Não informado"}\n`;
    text += `Telefone: ${formatBrazilianPhoneForDisplay(selectedClient.phone)}\n`;
    text += `CPF: ${selectedClient.cpf}\n\n`;

    // Informações de Localização
    text += "INFORMAÇÕES DE LOCALIZAÇÃO:\n";
    text += "-".repeat(30) + "\n";
    text += `Cidade: ${selectedClient.city ? capitalizeFirst(selectedClient.city) : "Não informado"}\n`;
    text += `Estado: ${selectedClient.state || "Não informado"}\n`;
    text += `CEP: ${selectedClient.cep || "Não informado"}\n`;
    text += `Endereço: ${selectedClient.address ? capitalizeFirst(selectedClient.address) : "Não informado"}\n\n`;

    // Informações do Cadastro
    text += "INFORMAÇÕES DO CADASTRO:\n";
    text += "-".repeat(25) + "\n";
    text += `Data de Cadastro: ${selectedClient.createdAt ? format(new Date(selectedClient.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Não informado"}\n`;
    if (selectedClient.updatedAt) {
      text += `Última Atualização: ${format(new Date(selectedClient.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
    }
    text += "\n";

    // Pets do Cliente
    if (clientPets && clientPets.length > 0) {
      text += "PETS DO CLIENTE:\n";
      text += "-".repeat(20) + "\n";
      
      clientPets.forEach((pet: Pet, index: number) => {
        text += `\nPet ${index + 1}:\n`;
        text += `  Nome: ${capitalizeFirst(pet.name)}\n`;
        text += `  Espécie: ${pet.species}\n`;
        if (pet.breed) text += `  Raça: ${pet.breed}\n`;
        if (pet.age) text += `  Idade: ${pet.age}\n`;
        if (pet.sex) text += `  Sexo: ${pet.sex}\n`;
        if (pet.color) text += `  Cor: ${pet.color}\n`;
        if (pet.weight) text += `  Peso: ${pet.weight}kg\n`;
        if (pet.birthDate) text += `  Data de Nascimento: ${format(new Date(pet.birthDate), "dd/MM/yyyy", { locale: ptBR })}\n`;
        if (pet.castrated !== null) text += `  Castrado: ${pet.castrated ? "Sim" : "Não"}\n`;
        if (pet.microchip) text += `  Microchip: ${pet.microchip}\n`;
        if (pet.lastCheckup) text += `  Último Check-up: ${format(new Date(pet.lastCheckup), "dd/MM/yyyy", { locale: ptBR })}\n`;
        
        // Informações de Saúde
        if (pet.previousDiseases || pet.surgeries || pet.allergies || pet.currentMedications || pet.hereditaryConditions || pet.parasiteTreatments) {
          text += `  \n  Informações de Saúde:\n`;
          if (pet.previousDiseases) text += `    Doenças Anteriores: ${pet.previousDiseases}\n`;
          if (pet.surgeries) text += `    Cirurgias: ${pet.surgeries}\n`;
          if (pet.allergies) text += `    Alergias: ${pet.allergies}\n`;
          if (pet.currentMedications) text += `    Medicações Atuais: ${pet.currentMedications}\n`;
          if (pet.hereditaryConditions) text += `    Condições Hereditárias: ${pet.hereditaryConditions}\n`;
          if (pet.parasiteTreatments) text += `    Tratamentos Antiparasitários: ${pet.parasiteTreatments}\n`;
        }
        
        // Vacinas
        if (pet.vaccineData && Array.isArray(pet.vaccineData) && pet.vaccineData.length > 0) {
          text += `  \n  Vacinas:\n`;
          pet.vaccineData.forEach((vaccine: { vaccine: string; date: string }) => {
            text += `    ${vaccine.vaccine}: ${format(new Date(vaccine.date), "dd/MM/yyyy", { locale: ptBR })}\n`;
          });
        }
      });
    } else {
      text += "PETS DO CLIENTE:\n";
      text += "-".repeat(20) + "\n";
      text += "Nenhum pet cadastrado para este cliente.\n";
    }

    text += "\n" + "=".repeat(50) + "\n";
    text += `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}\n`;
    text += "=".repeat(50);

    return text;
  };

  const handleCopyToClipboard = async () => {
    if (copyState !== 'idle') return;
    
    try {
      setCopyState('copying');
      const text = generateClientText();
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

  // Preparação de dados para PDF - busca todos os dados com filtros aplicados
  const preparePdfData = async () => {
    // Buscar TODOS os dados considerando o filtro de busca
    let allData: Client[] = [];
    
    if (searchQuery.length >= 2) {
      // Se há busca, buscar todos os resultados da pesquisa
      const response = await fetch(`/admin/api/clients/search/${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        allData = await response.json();
      }
    } else {
      // Sem busca, usar todos os clientes já carregados
      allData = clients;
    }
    
    // Mapear todos os dados para o formato PDF
    return allData.map(client => {
      const pdfData: any = {};
      
      // Adiciona apenas os campos que estão visíveis na tabela
      if (visibleColumns.includes("Nome")) {
        pdfData['Nome'] = (client.fullName || client.full_name) ? capitalizeFirst(client.fullName || client.full_name) : '';
      }
      if (visibleColumns.includes("Email")) {
        pdfData['Email'] = client.email || 'Não informado';
      }
      if (visibleColumns.includes("Telefone")) {
        pdfData['Telefone'] = formatBrazilianPhoneForDisplay(client.phone || '');
      }
      if (visibleColumns.includes("CPF")) {
        pdfData['CPF'] = client.cpf || '';
      }
      if (visibleColumns.includes("Cidade")) {
        pdfData['Cidade'] = client.city ? capitalizeFirst(client.city) : 'Não informado';
      }
      if (visibleColumns.includes("Data")) {
        pdfData['Data de Cadastro'] = client.createdAt ? 
          format(new Date(client.createdAt), "dd/MM/yyyy", { locale: ptBR }) : '';
      }
      
      return pdfData;
    });
  };

  // Preparação de dados para Excel - busca todos os dados incluindo pets
  const prepareExcelData = async () => {
    // Buscar TODOS os dados considerando o filtro de busca
    let allData: Client[] = [];
    
    if (searchQuery.length >= 2) {
      // Se há busca, buscar todos os resultados da pesquisa
      const response = await fetch(`/admin/api/clients/search/${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        allData = await response.json();
      }
    } else {
      // Sem busca, usar todos os clientes já carregados
      allData = clients;
    }
    
    const enrichedData = [];
    
    for (const client of allData) {
      try {
        const response = await fetch(`/admin/api/clients/${client.id}/pets`);
        const pets: Pet[] = response.ok ? await response.json() : [];
        
        // Dados organizados do cliente - Seção Principal
        const exportData: any = {
          // === INFORMAÇÕES DO CLIENTE ===
          '👤 Nome Completo': (client.fullName || client.full_name) ? capitalizeFirst(client.fullName || client.full_name) : '',
          '📧 Email': client.email || 'Não informado',
          '📱 Telefone': formatBrazilianPhoneForDisplay(client.phone || ''),
          '📄 CPF': client.cpf || '',
          
          // === ENDEREÇO ===
          '📍 CEP': client.cep || 'Não informado',
          '🏠 Endereço': client.address ? capitalizeFirst(client.address) : 'Não informado',
          '🌆 Cidade': client.city ? capitalizeFirst(client.city) : 'Não informado',
          '🗺️ Estado': client.state || 'Não informado',
          
          // === DATAS ===
          '📅 Data de Cadastro': client.createdAt ? format(new Date(client.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '',
          '🔄 Última Atualização': client.updatedAt ? format(new Date(client.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '',
          
          // === CONTAGEM DE PETS ===
          '🐾 Total de Pets': pets ? pets.length.toString() : '0',
        };
        
        if (pets && pets.length > 0) {
          // Adicionar informações de cada pet de forma mais organizada
          pets.forEach((pet, index) => {
            const petNum = index + 1;
            
            // === DADOS BÁSICOS DO PET ===
            exportData[`[PET ${petNum}] Nome`] = pet.name ? capitalizeFirst(pet.name) : '';
            exportData[`[PET ${petNum}] Espécie`] = pet.species || '';
            exportData[`[PET ${petNum}] Raça`] = pet.breed || 'Não informado';
            exportData[`[PET ${petNum}] Sexo`] = pet.sex || pet.gender || 'Não informado';
            exportData[`[PET ${petNum}] Idade`] = pet.age || 'Não informado';
            exportData[`[PET ${petNum}] Cor`] = pet.color || 'Não informado';
            exportData[`[PET ${petNum}] Peso (kg)`] = pet.weight ? `${pet.weight} kg` : 'Não informado';
            exportData[`[PET ${petNum}] Data Nascimento`] = pet.birthDate ? format(new Date(pet.birthDate), "dd/MM/yyyy", { locale: ptBR }) : 'Não informado';
            exportData[`[PET ${petNum}] Castrado`] = pet.castrated !== undefined && pet.castrated !== null ? (pet.castrated ? 'Sim' : 'Não') : 'Não informado';
            
            // === IDENTIFICAÇÃO DO PET ===
            exportData[`[PET ${petNum}] Microchip`] = pet.microchip || 'Não possui';
            
            // === HISTÓRICO MÉDICO DO PET ===
            exportData[`[PET ${petNum}] Último Check-up`] = pet.lastCheckup ? format(new Date(pet.lastCheckup), "dd/MM/yyyy", { locale: ptBR }) : 'Não realizado';
            exportData[`[PET ${petNum}] Doenças Anteriores`] = pet.previousDiseases || 'Nenhuma registrada';
            exportData[`[PET ${petNum}] Cirurgias Realizadas`] = pet.surgeries || 'Nenhuma registrada';
            exportData[`[PET ${petNum}] Alergias`] = pet.allergies || 'Nenhuma registrada';
            exportData[`[PET ${petNum}] Medicações Atuais`] = pet.currentMedications || pet.medications || 'Nenhuma';
            exportData[`[PET ${petNum}] Condições Crônicas`] = pet.chronicConditions || 'Nenhuma';
            exportData[`[PET ${petNum}] Condições Hereditárias`] = pet.hereditaryConditions || 'Nenhuma conhecida';
            exportData[`[PET ${petNum}] Tratamentos Antiparasitários`] = pet.parasiteTreatments || 'Nenhum registrado';
            exportData[`[PET ${petNum}] Observações`] = pet.observations || 'Sem observações';
            
            // === VACINAÇÃO DO PET ===
            if (pet.vaccineData && Array.isArray(pet.vaccineData) && pet.vaccineData.length > 0) {
              const vaccines = pet.vaccineData
                .map((v: any) => `${v.vaccine || 'Vacina'}: ${v.date ? format(new Date(v.date), "dd/MM/yyyy", { locale: ptBR }) : 'Data não registrada'}`)
                .join(' | ');
              exportData[`[PET ${petNum}] Vacinas Aplicadas`] = vaccines;
            } else {
              exportData[`[PET ${petNum}] Vacinas Aplicadas`] = 'Nenhuma vacina registrada';
            }
            
            // === STATUS DO PET ===
            exportData[`[PET ${petNum}] Cadastrado em`] = pet.createdAt ? format(new Date(pet.createdAt), "dd/MM/yyyy", { locale: ptBR }) : 'Data não registrada';
          });
        } else {
          // Caso não tenha pets
          exportData['🐾 Informação de Pets'] = 'Nenhum pet cadastrado para este cliente';
        }
        
        enrichedData.push(exportData);
      } catch (error) {
        console.error(`Erro ao buscar pets para cliente ${client.id}:`, error);
        // Em caso de erro, ainda exporta os dados básicos do cliente
        enrichedData.push({
          '👤 Nome Completo': client.fullName || client.full_name || '',
          '📧 Email': client.email || 'Não informado',
          '📱 Telefone': formatBrazilianPhoneForDisplay(client.phone || ''),
          '📄 CPF': client.cpf || '',
          '⚠️ Status': 'Erro ao carregar dados completos dos pets'
        });
      }
    }
    
    return enrichedData;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground break-words">Clientes & Pets</h1>
          <p className="text-sm text-muted-foreground">Gerencie clientes e seus pets</p>
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
                setCurrentPage(1); // Reset para página 1 ao buscar
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // Previne o refresh da página ao pressionar Enter
                }
              }}
              className="pl-10 w-80"
              data-testid="input-search-clients"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="admin-action"
            size="sm"
            onClick={() => setLocation("/clientes/novo")}
            data-testid="button-new-client"
            disabled={!canAdd()}
            title={!canAdd() ? "Você não tem permissão para adicionar clientes" : ""}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
          
          <ExportButton 
            data={filteredClients}
            filename="clientes"
            title="Exportação de Clientes"
            pageName="Clientes"
            preparePdfData={preparePdfData}
            prepareExcelData={prepareExcelData}
            visibleColumns={visibleColumns}
            disabled={isLoading || searchLoading || filteredClients.length === 0}
          />
          
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
            {isLoading || searchLoading ? (
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
                    <TableCell className="font-medium bg-white">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="whitespace-nowrap">
                          {(client.fullName || client.full_name) ? capitalizeFirst(client.fullName || client.full_name) : ''}
                        </span>
                        {client.petCount === 0 && (
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 whitespace-nowrap">
                            Carrinho Abandonado
                          </Badge>
                        )}
                      </div>
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
                      {client.city ? capitalizeFirst(client.city) : "Não informado"}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Data") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      {client.createdAt && format(new Date(client.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  )}
                  {visibleColumns.includes("Ações") && (
                    <TableCell className="whitespace-nowrap bg-white">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(client)}
                          data-testid={`button-view-${client.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/clientes/${client.id}/pets/novo`)}
                          data-testid={`button-add-pet-${client.id}`}
                          disabled={!canAdd()}
                          title={!canAdd() ? "Você não tem permissão para adicionar pets" : ""}
                        >
                          <AddPetIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/clientes/${client.id}/editar`)}
                          data-testid={`button-edit-${client.id}`}
                          disabled={!canEdit()}
                          title={!canEdit() ? "Você não tem permissão para editar clientes" : ""}
                        >
                          <Edit className="h-4 w-4" />
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
                    {searchQuery.length >= 2
                      ? "Nenhum cliente encontrado para a busca."
                      : "Nenhum cliente cadastrado ainda."
                    }
                  </p>
                  {searchQuery.length < 2 && (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setLocation("/clientes/novo")}
                      data-testid="button-add-first-client"
                      disabled={!canAdd()}
                      title={!canAdd() ? "Você não tem permissão para adicionar clientes" : ""}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Primeiro Cliente
                    </Button>
                  )}
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
                data-testid="button-copy-details"
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
            <div 
              className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar" 
            >
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações Pessoais</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Nome Completo:</strong> <span className="text-foreground">{capitalizeFirst(selectedClient.fullName)}</span></span>
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

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Informações de Localização</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Cidade:</strong> <span className="text-foreground">{selectedClient.city ? capitalizeFirst(selectedClient.city) : "Não informado"}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Estado:</strong> <span className="text-foreground">{selectedClient.state || "Não informado"}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">CEP:</strong> <span className="text-foreground">{selectedClient.cep || "Não informado"}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Endereço:</strong> <span className="text-foreground">{selectedClient.address ? capitalizeFirst(selectedClient.address) : "Não informado"}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-2">Informações do Cadastro</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <span><strong className="text-primary">Data de Cadastro:</strong> <span className="text-foreground">{selectedClient.createdAt && format(new Date(selectedClient.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></span>
                  </div>
                  {selectedClient.updatedAt && (
                    <div className="flex items-center space-x-2">
                      <span><strong className="text-primary">Última Atualização:</strong> <span className="text-foreground">{format(new Date(selectedClient.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></span>
                    </div>
                  )}
                </div>
              </div>


              {/* Seção de Pets */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Pets do Cliente</h4>
                {petsLoading ? (
                  <div className="text-sm text-muted-foreground">Carregando pets...</div>
                ) : clientPets && clientPets.length > 0 ? (
                  <div className="space-y-2">
                    {clientPets.map((pet: any) => (
                      <div key={pet.id} className="border rounded-lg p-3 bg-muted/30">
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          {/* Informações Básicas */}
                          <div className="flex items-center space-x-2">
                            <span><strong className="text-primary">Nome:</strong> <span className="text-foreground">{capitalizeFirst(pet.name)}</span></span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span><strong className="text-primary">Espécie:</strong> <span className="text-foreground">{pet.species}</span></span>
                          </div>
                          {pet.breed && (
                            <div className="flex items-center space-x-2">
                              <span><strong className="text-primary">Raça:</strong> <span className="text-foreground">{pet.breed}</span></span>
                            </div>
                          )}
                          {pet.age && (
                            <div className="flex items-center space-x-2">
                              <span><strong className="text-primary">Idade:</strong> <span className="text-foreground">{pet.age}</span></span>
                            </div>
                          )}
                          {pet.sex && (
                            <div className="flex items-center space-x-2">
                              <span><strong className="text-primary">Sexo:</strong> <span className="text-foreground">{pet.sex}</span></span>
                            </div>
                          )}
                          {pet.color && (
                            <div className="flex items-center space-x-2">
                              <span><strong className="text-primary">Cor:</strong> <span className="text-foreground">{pet.color}</span></span>
                            </div>
                          )}
                          {pet.weight && (
                            <div className="flex items-center space-x-2">
                              <span><strong className="text-primary">Peso:</strong> <span className="text-foreground">{pet.weight}kg</span></span>
                            </div>
                          )}
                          {pet.birthDate && (
                            <div className="flex items-center space-x-2">
                              <span><strong className="text-primary">Data de Nascimento:</strong> <span className="text-foreground">{format(new Date(pet.birthDate), "dd/MM/yyyy", { locale: ptBR })}</span></span>
                            </div>
                          )}
                          {pet.castrated !== null && (
                            <div className="flex items-center space-x-2">
                              <span><strong className="text-primary">Castrado:</strong> <span className="text-foreground">{pet.castrated ? "Sim" : "Não"}</span></span>
                            </div>
                          )}
                          {pet.microchip && (
                            <div className="flex items-center space-x-2">
                              <span><strong className="text-primary">Microchip:</strong> <span className="text-foreground">{pet.microchip}</span></span>
                            </div>
                          )}
                          {pet.lastCheckup && (
                            <div className="flex items-center space-x-2">
                              <span><strong className="text-primary">Último Check-up:</strong> <span className="text-foreground">{format(new Date(pet.lastCheckup), "dd/MM/yyyy", { locale: ptBR })}</span></span>
                            </div>
                          )}
                        </div>
                        
                        {/* Informações de Saúde */}
                        {(pet.previousDiseases || pet.surgeries || pet.allergies || pet.currentMedications || pet.hereditaryConditions || pet.parasiteTreatments) && (
                          <div className="mt-3 pt-2 border-t border-border">
                            <h5 className="font-medium text-foreground mb-2">Informações de Saúde</h5>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              {pet.previousDiseases && (
                                <div className="flex items-start space-x-2">
                                  <span><strong className="text-primary">Doenças Anteriores:</strong> <span className="text-foreground">{pet.previousDiseases}</span></span>
                                </div>
                              )}
                              {pet.surgeries && (
                                <div className="flex items-start space-x-2">
                                  <span><strong className="text-primary">Cirurgias:</strong> <span className="text-foreground">{pet.surgeries}</span></span>
                                </div>
                              )}
                              {pet.allergies && (
                                <div className="flex items-start space-x-2">
                                  <span><strong className="text-primary">Alergias:</strong> <span className="text-foreground">{pet.allergies}</span></span>
                                </div>
                              )}
                              {pet.currentMedications && (
                                <div className="flex items-start space-x-2">
                                  <span><strong className="text-primary">Medicações Atuais:</strong> <span className="text-foreground">{pet.currentMedications}</span></span>
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
                        
                        {/* Botões de Ação do Pet */}
                        <div className="mt-3 pt-2 border-t border-border">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDetailsOpen(false);
                                setLocation(`/atendimentos/novo?clientId=${selectedClient.id}&petId=${pet.id}`);
                              }}
                              className="text-xs"
                            >
                              <FileText className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDetailsOpen(false);
                                setLocation(`/pets/${pet.id}/editar`);
                              }}
                              className="text-xs"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum pet cadastrado para este cliente.</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}