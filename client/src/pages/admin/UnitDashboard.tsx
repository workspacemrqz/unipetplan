import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileText, User, Heart, MapPin, Clock, DollarSign, CheckCircle, XCircle, Eye, Users, CreditCard, Plus, Settings, Search, AlertCircle, Info, Loader2 } from "lucide-react";
import DigitalCard from "@/components/DigitalCard";
import { formatBrazilianPhoneForDisplay } from "@/hooks/use-site-settings";
import LoadingDots from "@/components/ui/LoadingDots";

interface NetworkUnit {
  id: string;
  name: string;
  address: string;
  phone?: string;
  urlSlug: string;
}

interface Guide {
  id: string;
  clientId: string;
  petId: string;
  procedure: string;
  procedureNotes?: string;
  generalNotes?: string;
  value?: string;
  status: string;
  unitStatus?: string;
  createdAt: string;
  client?: {
    name: string;
    email: string;
    phone: string;
  };
  pet?: {
    name: string;
    species: string;
    breed: string;
  };
}

interface Client {
  id: string;
  fullName: string;
  email?: string;
  phone: string;
  cpf: string;
  address?: string;
  city?: string;
  createdAt: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  sex: string;
  age?: string;
  clientId: string;
  planId?: string;
  plan?: Plan;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface Procedure {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface ProcedureCoverage {
  planId: string;
  planName: string;
  isIncluded: boolean;
  price: number;
  payValue: number;
  coparticipacao: number;
}

interface CalculatedValues {
  procedurePrice: number;
  coparticipacao: number;
  finalValue: number;
  isIncluded: boolean;
  planName?: string;
}

interface Coverage {
  procedure: {
    id: string;
    name: string;
    description?: string;
  };
  planCoverage: {
    planId: string;
    planName: string;
    isIncluded: boolean;
    price: number;
    payValue: number;
    coparticipacao: number;
  }[];
}

interface AuthState {
  isAuthenticated: boolean;
  unit: NetworkUnit | null;
  token: string | null;
}

export default function UnitDashboard() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    unit: null,
    token: null
  });
  const [guides, setGuides] = useState<Guide[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingCoverage, setLoadingCoverage] = useState(false);
  const [loginData, setLoginData] = useState({ login: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("guides");
  
  // Guide creation form state
  const [guideForm, setGuideForm] = useState({
    clientId: "",
    petId: "",
    procedure: "",
    procedureId: "",
    procedureNotes: "",
    generalNotes: "",
    coparticipacao: "",
    receber: ""
  });
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [availablePets, setAvailablePets] = useState<Pet[]>([]);
  const [availableProcedures, setAvailableProcedures] = useState<Procedure[]>([]);
  const [selectedPetData, setSelectedPetData] = useState<Pet & { plan?: Plan } | null>(null);
  const [calculatedValues, setCalculatedValues] = useState<CalculatedValues | null>(null);
  const [submittingGuide, setSubmittingGuide] = useState(false);
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [loadingCalculation, setLoadingCalculation] = useState(false);
  
  // Cards functionality state
  const [petsWithClients, setPetsWithClients] = useState<Array<Pet & { client: Client, plan?: Plan }>>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cpfSearch, setCpfSearch] = useState("");
  const [searchedCpf, setSearchedCpf] = useState("");
  const [showCards, setShowCards] = useState(false);
  
  // Coverage functionality state
  const [coverageSearch, setCoverageSearch] = useState("");
  const [coverageStatusFilter, setCoverageStatusFilter] = useState("all");

  // CPF search functionality
  const handleCpfSearch = () => {
    if (!cpfSearch.trim()) return;
    
    setSearchedCpf(cpfSearch.trim());
    setShowCards(true);
  };

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Load guides when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.unit) {
      loadGuides();
    }
  }, [authState.isAuthenticated, authState.unit]);

  // Load data when tab changes
  useEffect(() => {
    if (authState.isAuthenticated && authState.unit) {
      if (activeTab === 'clients') {
        loadClients();
      } else if (activeTab === 'coverage') {
        loadCoverage();
      } else if (activeTab === 'create-guide') {
        loadClientsForGuides();
        loadActiveProcedures();
      } else if (activeTab === 'cards') {
        loadCardsData();
      }
    }
  }, [activeTab, authState.isAuthenticated, authState.unit]);

  const checkAuthentication = async () => {
    try {
      const response = await fetch("/admin/api/unit/verify-session", {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.valid && data.unit) {
          setAuthState({
            isAuthenticated: true,
            unit: data.unit,
            token: null // Using cookies for auth
          });
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch("/admin/api/unit/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAuthState({
          isAuthenticated: true,
          unit: data.unit,
          token: data.token
        });
        setLoginData({ login: "", password: "" });
      } else {
        setLoginError(data.message || "Erro ao fazer login");
      }
    } catch (error) {
      setLoginError("Erro de conexão");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/admin/api/unit/logout", {
        method: "POST",
        credentials: 'include'
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setAuthState({
        isAuthenticated: false,
        unit: null,
        token: null
      });
      setGuides([]);
    }
  };

  const loadGuides = async () => {
    try {
      const response = await fetch(`/admin/api/unit/${authState.unit?.id}/atendimentos`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setGuides(data);
      }
    } catch (error) {
      console.error("Failed to load guides:", error);
    }
  };

  const loadClients = async () => {
    if (!authState.unit?.id) return;
    
    setLoadingClients(true);
    try {
      const response = await fetch(`/admin/api/unit/${authState.unit.id}/clients`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadCoverage = async () => {
    if (!authState.unit?.id) return;
    
    setLoadingCoverage(true);
    try {
      const response = await fetch(`/admin/api/unit/${authState.unit.id}/coverage`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCoverage(data);
      }
    } catch (error) {
      console.error("Failed to load coverage:", error);
    } finally {
      setLoadingCoverage(false);
    }
  };

  const loadCardsData = async () => {
    if (!authState.unit?.id) return;
    
    setLoadingCards(true);
    try {
      // Load clients with their pets and plan information
      const clientsResponse = await fetch(`/admin/api/unit/${authState.unit.id}/clients`, {
        credentials: 'include'
      });

      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        
        // For each client, fetch their pets
        const petsWithClientsPromises = clientsData.map(async (client: Client) => {
          try {
            const petsResponse = await fetch(`/admin/api/clients/${client.id}/pets`, {
              credentials: 'include'
            });
            if (petsResponse.ok) {
              const pets = await petsResponse.json();
              
              // For each pet, add client data and potentially plan data
              return pets.map((pet: Pet) => ({
                ...pet,
                client,
                plan: pet.planId ? { id: pet.planId, name: "Plano Ativo", description: "Cobertura ativa" } : undefined
              }));
            }
            return [];
          } catch (error) {
            console.error(`Failed to load pets for client ${client.id}:`, error);
            return [];
          }
        });

        const petsArrays = await Promise.all(petsWithClientsPromises);
        const allPets = petsArrays.flat();
        setPetsWithClients(allPets);
      }
    } catch (error) {
      console.error("Failed to load cards data:", error);
    } finally {
      setLoadingCards(false);
    }
  };

  const loadClientsForGuides = async () => {
    if (!authState.unit?.id) return;
    
    try {
      const response = await fetch(`/admin/api/unit/${authState.unit.id}/clients`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableClients(data);
      }
    } catch (error) {
      console.error("Failed to load unit clients for guide creation:", error);
    }
  };

  const loadPetsForClient = async (clientId: string) => {
    // Validação de segurança: só busca pets de clientes carregados para esta unidade
    const isClientFromThisUnit = availableClients.some(client => client.id === clientId);
    if (!isClientFromThisUnit) {
      console.error("Security violation: Trying to load pets for client not from this unit");
      return;
    }

    try {
      const response = await fetch(`/admin/api/clients/${clientId}/pets`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAvailablePets(data);
      }
    } catch (error) {
      console.error("Failed to load pets:", error);
    }
  };

  const handleClientChange = (clientId: string) => {
    setGuideForm(prev => ({ ...prev, clientId, petId: "", procedureId: "", coparticipacao: "", receber: "" }));
    setAvailablePets([]);
    setSelectedPetData(null);
    setCalculatedValues(null);
    if (clientId) {
      loadPetsForClient(clientId);
    }
  };

  const handlePetChange = async (petId: string) => {
    setGuideForm(prev => ({ ...prev, petId, procedureId: "", coparticipacao: "", receber: "" }));
    setCalculatedValues(null);
    
    if (petId) {
      const selectedPet = availablePets.find(pet => pet.id === petId);
      if (selectedPet) {
        try {
          // Load pet details with plan info if it has a plan
          let petWithPlan = { ...selectedPet };
          
          if (selectedPet.planId) {
            const planResponse = await fetch(`/admin/api/plans/${selectedPet.planId}`, {
              credentials: 'include'
            });
            if (planResponse.ok) {
              const planData = await planResponse.json();
              petWithPlan = { ...selectedPet, plan: planData };
            }
          }
          
          setSelectedPetData(petWithPlan);
        } catch (error) {
          console.error("Failed to load pet details:", error);
          setSelectedPetData(selectedPet);
        }
      }
    } else {
      setSelectedPetData(null);
    }
  };

  const handleProcedureChange = async (procedureId: string) => {
    setGuideForm(prev => ({ ...prev, procedureId, coparticipacao: "", receber: "" }));
    setCalculatedValues(null);
    
    if (procedureId && selectedPetData) {
      await calculateProcedureValues(procedureId, selectedPetData);
    }
  };

  const loadActiveProcedures = async () => {
    setLoadingProcedures(true);
    try {
      const response = await fetch('/admin/api/procedures/active', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableProcedures(data);
      }
    } catch (error) {
      console.error("Failed to load procedures:", error);
    } finally {
      setLoadingProcedures(false);
    }
  };

  const calculateProcedureValues = async (procedureId: string, petData: Pet & { plan?: Plan }) => {
    if (!authState.unit?.id || !petData.planId) {
      // If no plan, just show procedure price without coparticipação
      const selectedProcedure = availableProcedures.find(p => p.id === procedureId);
      if (selectedProcedure) {
        setGuideForm(prev => ({ ...prev, procedure: selectedProcedure.name }));
      }
      return;
    }

    setLoadingCalculation(true);
    try {
      // Get coverage data for this unit
      const coverageResponse = await fetch(`/admin/api/unit/${authState.unit.id}/coverage`, {
        credentials: 'include'
      });
      
      if (coverageResponse.ok) {
        const coverageData = await coverageResponse.json();
        
        // Find the specific procedure in coverage
        const procedureCoverage = coverageData.find((c: Coverage) => 
          c.procedure.id === procedureId
        );
        
        if (procedureCoverage) {
          // Find plan coverage for this pet's plan
          const planCoverage = procedureCoverage.planCoverage.find(
            (pc: ProcedureCoverage) => pc.planId === petData.planId
          );
          
          if (planCoverage) {
            const procedurePrice = planCoverage.price / 100; // Convert from cents
            const coparticipacao = planCoverage.coparticipacao / 100; // Convert from cents
            const payValue = planCoverage.payValue / 100; // Convert from cents (valor a receber)
            const finalValue = procedurePrice - coparticipacao;
            
            const calculatedData: CalculatedValues = {
              procedurePrice,
              coparticipacao,
              finalValue: Math.max(0, finalValue),
              isIncluded: planCoverage.isIncluded,
              planName: planCoverage.planName
            };
            
            setCalculatedValues(calculatedData);
            setGuideForm(prev => ({ 
              ...prev, 
              procedure: procedureCoverage.procedure.name,
              coparticipacao: coparticipacao.toFixed(2),
              receber: payValue.toFixed(2)
            }));
          }
        }
      }
    } catch (error) {
      console.error("Failed to calculate procedure values:", error);
    } finally {
      setLoadingCalculation(false);
    }
  };

  const createGuide = async () => {
    if (!guideForm.clientId || !guideForm.petId || !guideForm.procedureId) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setSubmittingGuide(true);
    try {
      const response = await fetch('/admin/api/unit/atendimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientId: guideForm.clientId,
          petId: guideForm.petId,
          procedure: guideForm.procedure,
          procedureNotes: guideForm.procedureNotes,
          generalNotes: guideForm.generalNotes,
          coparticipacao: guideForm.coparticipacao,
          receber: guideForm.receber,
          value: guideForm.receber // Mantendo value para compatibilidade com o backend
        })
      });

      if (response.ok) {
        alert("Atendimento criado com sucesso!");
        setGuideForm({
          clientId: "",
          petId: "",
          procedure: "",
          procedureId: "",
          procedureNotes: "",
          generalNotes: "",
          coparticipacao: "",
          receber: ""
        });
        setAvailablePets([]);
        setSelectedPetData(null);
        setCalculatedValues(null);
        loadGuides(); // Reload guides
      } else {
        const error = await response.json();
        alert(`Erro ao criar atendimento: ${error.message}`);
      }
    } catch (error) {
      alert("Erro de conexão ao criar atendimento.");
    } finally {
      setSubmittingGuide(false);
    }
  };

  const updateGuideStatus = async (guideId: string, unitStatus: string) => {
    try {
      const response = await fetch(`/admin/api/unit/atendimentos/${guideId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ unitStatus })
      });

      if (response.ok) {
        loadGuides(); // Reload guides
        setSelectedGuide(null);
      }
    } catch (error) {
      console.error("Failed to update guide status:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: "Aberta" },
      closed: { label: "Concluída" },
      cancelled: { label: "Cancelada" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status };
    
    return <Badge variant="neutral">{config.label}</Badge>;
  };

  const formatCurrency = (value?: string) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };

  // Memoized filtered coverage for performance optimization
  const filteredCoverage = useMemo(() => {
    return coverage.filter(item => {
      // Search filter
      const searchMatch = !coverageSearch || 
        item.procedure.name.toLowerCase().includes(coverageSearch.toLowerCase()) ||
        (item.procedure.description && item.procedure.description.toLowerCase().includes(coverageSearch.toLowerCase()));
      
      // Status filter
      let statusMatch = true;
      if (coverageStatusFilter === 'included') {
        statusMatch = item.planCoverage.some(plan => plan.isIncluded);
      } else if (coverageStatusFilter === 'not_included') {
        statusMatch = item.planCoverage.every(plan => !plan.isIncluded);
      }
      
      return searchMatch && statusMatch;
    });
  }, [coverage, coverageSearch, coverageStatusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingDots size="md" color="#0e7074" className="mb-2" />
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Acesso de Unidades</CardTitle>
            <CardDescription>
              Faça login para acessar o painel da sua unidade credenciada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Login</Label>
                <Input
                  id="login"
                  type="text"
                  value={loginData.login}
                  onChange={(e) => setLoginData(prev => ({ ...prev, login: e.target.value }))}
                  placeholder="Digite seu login"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Digite sua senha"
                  required
                />
              </div>
              {loginError && (
                <div className="text-red-600 text-sm text-center">
                  {loginError}
                </div>
              )}
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 py-3 sm:py-4">
            <div className="flex items-center space-x-4 min-w-0">
              <Heart className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 break-words">
                  {authState.unit?.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 flex items-center break-words">
                  <MapPin className="h-4 w-4 mr-1" />
                  {authState.unit?.address}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="w-full sm:w-auto text-xs sm:text-sm">
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 break-words">Painel da Unidade</h2>
          <p className="text-sm sm:text-base text-gray-600">
            Gerencie todas as operações da sua unidade credenciada
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1">
            <TabsTrigger value="guides" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Atendimentos</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Planos</span>
            </TabsTrigger>
            <TabsTrigger value="create-guide" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Lançar</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Carteirinhas</span>
            </TabsTrigger>
            <TabsTrigger value="coverage" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Cobertura</span>
            </TabsTrigger>
          </TabsList>

          {/* Guides Tab */}
          <TabsContent value="guides">
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-4">Atendimentos</h3>
                <Tabs defaultValue="open" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3 gap-1">
                    <TabsTrigger value="open">Abertas</TabsTrigger>
                    <TabsTrigger value="closed">Concluídas</TabsTrigger>
                    <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
                  </TabsList>

                  {["open", "closed", "cancelled"].map(status => (
                    <TabsContent key={status} value={status}>
                      <div className="grid gap-4">
                        {guides
                          .filter(guide => guide.unitStatus === status)
                          .map(guide => (
                            <Card key={guide.id} className="">
                              <CardContent className="p-3 sm:p-4 lg:p-6">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <h3 className="text-lg font-semibold">{guide.procedure}</h3>
                                      {getStatusBadge(guide.unitStatus || "open")}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                      <div className="flex items-center space-x-2">
                                        <User className="h-4 w-4" />
                                        <span>{guide.client?.name || "Cliente não encontrado"}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Heart className="h-4 w-4" />
                                        <span>{guide.pet?.name || "Pet não encontrado"}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Clock className="h-4 w-4" />
                                        <span>{new Date(guide.createdAt).toLocaleDateString('pt-BR')}</span>
                                      </div>
                                    </div>
                                    {guide.value && (
                                      <div className="flex items-center space-x-2 mt-2 text-sm">
                                        <DollarSign className="h-4 w-4 text-green-600" />
                                        <span className="font-medium text-green-600">
                                          {formatCurrency(guide.value)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedGuide(guide)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {status === "open" && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateGuideStatus(guide.id, "closed")}
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateGuideStatus(guide.id, "cancelled")}
                                        >
                                          <XCircle className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        
                        {guides.filter(guide => guide.unitStatus === status).length === 0 && (
                          <Card>
                            <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Nenhum atendimento {status === "open" ? "aberto" : 
                                              status === "closed" ? "concluído" :
                                              status === "cancelled" ? "cancelado" : "encontrado"}
                              </h3>
                              <p className="text-gray-500">
                                Os atendimentos aparecerão aqui quando houver solicitações.
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Clientes Vinculados</h3>
                <Button 
                  onClick={loadClients} 
                  disabled={loadingClients}
                  variant="outline"
                >
                  {loadingClients ? "Carregando..." : "Atualizar"}
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {loadingClients ? (
                <div className="text-center py-8">
                  <LoadingDots size="md" color="#0e7074" className="mb-2" />
                  <p className="mt-2 text-muted-foreground">Carregando clientes...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {clients
                    .filter(client => 
                      client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      client.cpf.includes(searchTerm) ||
                      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map(client => (
                      <Card key={client.id} className="">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold">{client.fullName}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mt-2">
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4" />
                                  <span>{client.cpf}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span>📞</span>
                                  <span>{formatBrazilianPhoneForDisplay(client.phone)}</span>
                                </div>
                                {client.email && (
                                  <div className="flex items-center space-x-2">
                                    <span>📧</span>
                                    <span>{client.email}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Cliente desde: {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  
                  {clients.filter(client => 
                    client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    client.cpf.includes(searchTerm) ||
                    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
                  ).length === 0 && (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente vinculado"}
                        </h3>
                        <p className="text-gray-500">
                          {searchTerm ? "Tente ajustar os termos de busca." : "Os clientes aparecerão aqui quando realizarem atendimentos na unidade."}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Plans Tab - Placeholder */}
          <TabsContent value="plans">
            <Card>
              <CardContent className="p-6 text-center">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Consulta de Planos</h3>
                <p className="text-gray-500">
                  Funcionalidade em desenvolvimento. Aqui você poderá consultar os planos dos clientes com detalhes de coparticipação.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Guide Tab */}
          <TabsContent value="create-guide">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Lançar Novo Atendimento</h3>
                <p className="text-sm text-gray-600">
                  Inicie um novo atendimento para um cliente
                </p>
              </div>

              <Card>
                <CardContent className="p-6">
                  <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); createGuide(); }}>
                    {/* Client Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="client" className="text-sm font-medium">
                          Cliente <span className="text-red-500">*</span>
                        </Label>
                        <Select 
                          value={guideForm.clientId} 
                          onValueChange={handleClientChange}
                        >
                          <SelectTrigger
                            className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: 'white'
                            }}
                          >
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableClients.flatMap((client, index, array) => [
                              <SelectItem key={client.id} value={client.id} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                                {client.fullName} - {client.cpf}
                              </SelectItem>,
                              ...(index < array.length - 1 ? [<Separator key={`separator-${client.id}`} />] : [])
                            ])}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pet" className="text-sm font-medium">
                          Pet <span className="text-red-500">*</span>
                        </Label>
                        <Select 
                          value={guideForm.petId} 
                          onValueChange={handlePetChange}
                          disabled={!guideForm.clientId}
                        >
                          <SelectTrigger
                            className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: 'white'
                            }}
                          >
                            <SelectValue placeholder="Selecione um pet" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePets.flatMap((pet, index, array) => [
                              <SelectItem key={pet.id} value={pet.id} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                                {pet.name} - {pet.species} {pet.breed ? `(${pet.breed})` : ''}
                              </SelectItem>,
                              ...(index < array.length - 1 ? [<Separator key={`separator-${pet.id}`} />] : [])
                            ])}
                          </SelectContent>
                        </Select>
                        {!guideForm.clientId && (
                          <p className="text-xs text-gray-500">Selecione um cliente primeiro</p>
                        )}
                      </div>
                    </div>

                    {/* Procedure Selection */}
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="procedure" className="text-sm font-medium">
                          Procedimento <span className="text-red-500">*</span>
                        </Label>
                        <Select 
                          value={guideForm.procedureId} 
                          onValueChange={handleProcedureChange}
                          disabled={!guideForm.petId || loadingProcedures}
                        >
                          <SelectTrigger
                            className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: 'white'
                            }}
                          >
                            <SelectValue placeholder={loadingProcedures ? "Carregando procedimentos..." : "Selecione um procedimento"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProcedures.flatMap((procedure, index, array) => [
                              <SelectItem key={procedure.id} value={procedure.id} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                                {procedure.name}
                                {procedure.description && (
                                  <span className="text-xs text-gray-500 block">{procedure.description}</span>
                                )}
                              </SelectItem>,
                              ...(index < array.length - 1 ? [<Separator key={`separator-${procedure.id}`} />] : [])
                            ])}
                          </SelectContent>
                        </Select>
                        {!guideForm.petId && (
                          <p className="text-xs text-gray-500">Selecione um pet primeiro</p>
                        )}
                      </div>
                    </div>

                    {/* Pet Plan Information */}
                    {selectedPetData && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Info className="h-4 w-4 text-blue-600" />
                          <h4 className="text-sm font-medium text-blue-900">Informações do Pet</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-blue-700 font-medium">Pet:</span>
                            <p className="text-blue-900">{selectedPetData.name} - {selectedPetData.species}</p>
                          </div>
                          <div>
                            <span className="text-blue-700 font-medium">Plano:</span>
                            <p className="text-blue-900">
                              {selectedPetData.plan ? selectedPetData.plan.name : "Sem plano ativo"}
                            </p>
                          </div>
                          <div>
                            <span className="text-blue-700 font-medium">Status:</span>
                            <p className={`font-medium ${
                              selectedPetData.planId ? "text-green-600" : "text-orange-600"
                            }`}>
                              {selectedPetData.planId ? "Plano Ativo" : "Sem Cobertura"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Calculated Values Preview */}
                    {calculatedValues && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <Plus className="h-4 w-4 text-green-600" />
                          <h4 className="text-sm font-medium text-green-900">Cálculo Automático</h4>
                        </div>
                        
                        {calculatedValues.isIncluded ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-green-700 font-medium">Valor do Procedimento:</span>
                                <p className="text-lg font-semibold text-green-900">
                                  R$ {calculatedValues.procedurePrice.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <span className="text-green-700 font-medium">Coparticipação:</span>
                                <p className="text-lg font-semibold text-orange-600">
                                  - R$ {calculatedValues.coparticipacao.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <span className="text-green-700 font-medium">Valor Final Cliente:</span>
                                <p className="text-lg font-semibold text-green-600">
                                  R$ {calculatedValues.finalValue.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <div className="text-xs text-green-600 mt-2">
                              ✓ Procedimento coberto pelo plano {calculatedValues.planName}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm">
                            <div className="flex items-center space-x-2 text-orange-600 mb-2">
                              <AlertCircle className="h-4 w-4" />
                              <span className="font-medium">Procedimento não coberto pelo plano</span>
                            </div>
                            <p className="text-gray-600">
                              Este procedimento não está incluído no plano {calculatedValues.planName}. 
                              O cliente pagará o valor integral.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {loadingCalculation && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <LoadingDots size="sm" color="#0e7074" className="mb-2" />
                        <p className="text-sm text-gray-600">Calculando valores...</p>
                      </div>
                    )}

                    {/* Coparticipação e Receber Input */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="coparticipacao" className="text-sm font-medium">
                          Coparticipação (R$) {calculatedValues && <span className="text-xs text-gray-500">(calculado automaticamente)</span>}
                        </Label>
                        <Input
                          id="coparticipacao"
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={guideForm.coparticipacao}
                          onChange={(e) => setGuideForm(prev => ({ ...prev, coparticipacao: e.target.value }))}
                          className={calculatedValues ? "bg-gray-50" : ""}
                        />
                        {calculatedValues && (
                          <p className="text-xs text-gray-500">
                            Valor de coparticipação calculado automaticamente baseado no plano.
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="receber" className="text-sm font-medium">
                          Receber (R$) {calculatedValues && <span className="text-xs text-gray-500">(valor a receber)</span>}
                        </Label>
                        <Input
                          id="receber"
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={guideForm.receber}
                          onChange={(e) => setGuideForm(prev => ({ ...prev, receber: e.target.value }))}
                          className={calculatedValues ? "bg-gray-50" : ""}
                        />
                        {calculatedValues && (
                          <p className="text-xs text-gray-500">
                            Valor a receber da unidade. Pode ser ajustado se necessário.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="procedureNotes" className="text-sm font-medium">
                          Observações do Procedimento
                        </Label>
                        <Textarea
                          id="procedureNotes"
                          placeholder="Detalhes específicos sobre o procedimento..."
                          rows={3}
                          value={guideForm.procedureNotes}
                          onChange={(e) => setGuideForm(prev => ({ ...prev, procedureNotes: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="generalNotes" className="text-sm font-medium">
                          Observações Gerais
                        </Label>
                        <Textarea
                          id="generalNotes"
                          placeholder="Informações adicionais, contexto, etc..."
                          rows={3}
                          value={guideForm.generalNotes}
                          onChange={(e) => setGuideForm(prev => ({ ...prev, generalNotes: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-4 pt-4 border-t">
                      <Button 
                        type="button" 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGuideForm({
                            clientId: "",
                            petId: "",
                            procedure: "",
                            procedureId: "",
                            procedureNotes: "",
                            generalNotes: "",
                            coparticipacao: "",
                            receber: ""
                          });
                          setAvailablePets([]);
                          setSelectedPetData(null);
                          setCalculatedValues(null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        variant="admin-action"
                        size="sm"
                        disabled={submittingGuide || !guideForm.clientId || !guideForm.petId || !guideForm.procedureId}
                        className="min-w-[100px]"
                      >
                        {submittingGuide ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Atendimento
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-blue-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{availableClients.length}</div>
                    <div className="text-sm text-blue-600">Clientes Disponíveis</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{guides.filter(g => g.unitStatus === 'closed').length}</div>
                    <div className="text-sm text-green-600">Atendimentos Concluídas</div>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{guides.filter(g => g.unitStatus === 'open').length}</div>
                    <div className="text-sm text-yellow-600">Atendimentos Pendentes</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Carteirinhas Digitais</h3>
                  <p className="text-sm text-gray-600">Carteirinhas dos pets da sua unidade</p>
                </div>
                <div className="flex items-center space-x-3 w-full">
                  <div className="flex-1 max-w-md">
                    <Input
                      placeholder="Digite o CPF completo do cliente (000.000.000-00)"
                      value={cpfSearch}
                      onChange={(e) => setCpfSearch(e.target.value)}
                      className="w-full"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCpfSearch();
                        }
                      }}
                    />
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={handleCpfSearch}
                    disabled={!cpfSearch.trim()}
                    className="whitespace-nowrap"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                </div>
              </div>

              {loadingCards ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2 text-muted-foreground">Carregando carteirinhas...</span>
                </div>
              ) : showCards ? (
                <div className="space-y-6">
                  {petsWithClients
                    .filter(pet => {
                      const clientCpf = pet.client.cpf.replace(/[^0-9]/g, '');
                      const searchCpf = searchedCpf.replace(/[^0-9]/g, '');
                      return clientCpf === searchCpf && pet.plan;
                    })
                    .map(pet => (
                      <div key={pet.id} className="flex justify-center">
                        <DigitalCard
                          pet={{
                            id: pet.id,
                            name: pet.name,
                            species: pet.species,
                            breed: pet.breed || 'N/A',
                            sex: pet.sex || 'N/A',
                            age: pet.age || 'N/A'
                          }}
                          client={{
                            id: pet.client.id,
                            fullName: pet.client.fullName,
                            phone: formatBrazilianPhoneForDisplay(pet.client.phone),
                            city: pet.client.city || 'N/A'
                          }}
                          plan={pet.plan!}
                          unit={{
                            id: authState.unit!.id,
                            name: authState.unit!.name,
                            phone: formatBrazilianPhoneForDisplay(authState.unit!.phone) || 'N/A',
                            address: authState.unit!.address
                          }}
                          cardNumber={pet.id.replace(/-/g, '').substring(0, 9)}
                          className="w-full max-w-sm"
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Busque por CPF</h3>
                    <p className="text-gray-500">
                      Digite o CPF completo do cliente no campo acima e clique em "Buscar" para visualizar as carteirinhas dos pets.
                    </p>
                  </CardContent>
                </Card>
              )}

              {!loadingCards && petsWithClients.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma carteirinha encontrada</h3>
                    <p className="text-gray-500">
                      Ainda não há pets cadastrados para sua unidade.
                    </p>
                  </CardContent>
                </Card>
              )}

              {showCards && searchedCpf && petsWithClients.filter(pet => {
                const clientCpf = pet.client.cpf.replace(/[^0-9]/g, '');
                const searchCpf = searchedCpf.replace(/[^0-9]/g, '');
                return clientCpf === searchCpf;
              }).length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">CPF não encontrado</h3>
                    <p className="text-gray-500">
                      Nenhum cliente encontrado com o CPF <strong>{searchedCpf}</strong>.
                      Verifique se o CPF está correto.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Coverage Tab */}
          <TabsContent value="coverage">
            <div className="space-y-4">
              {/* Header with Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Tabela de Cobertura</h3>
                  <p className="text-sm text-gray-600">
                    Visualize a cobertura de procedimentos por plano
                  </p>
                </div>
                <Button 
                  onClick={loadCoverage} 
                  disabled={loadingCoverage}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {loadingCoverage ? "Carregando..." : "Atualizar"}
                </Button>
              </div>

              {/* Filters */}
              {!loadingCoverage && coverage.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Search */}
                      <div className="flex-1">
                        <Label htmlFor="coverage-search" className="text-sm font-medium">Buscar Procedimento</Label>
                        <div className="relative mt-1">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="coverage-search"
                            placeholder="Digite o nome do procedimento..."
                            value={coverageSearch}
                            onChange={(e) => setCoverageSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      {/* Status Filter */}
                      <div className="min-w-[200px]">
                        <Label htmlFor="status-filter" className="text-sm font-medium">Filtrar por Cobertura</Label>
                        <Select value={coverageStatusFilter} onValueChange={setCoverageStatusFilter}>
                          <SelectTrigger 
                            className="w-full p-3 rounded-lg border text-sm mt-1 [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: 'white'
                            }}
                          >
                            <SelectValue placeholder="Todas as coberturas" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              { value: "all", label: "Todas as coberturas" },
                              { value: "included", label: "Apenas incluídos" },
                              { value: "not_included", label: "Apenas não incluídos" }
                            ].flatMap((item, index, array) => [
                              <SelectItem key={item.value} value={item.value} className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground">
                                {item.label}
                              </SelectItem>,
                              ...(index < array.length - 1 ? [<Separator key={`separator-${item.value}`} />] : [])
                            ])}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loadingCoverage ? (
                <div className="text-center py-8">
                  <LoadingDots size="md" color="#0e7074" className="mb-2" />
                  <p className="mt-2 text-muted-foreground">Carregando cobertura...</p>
                </div>
              ) : coverage.length > 0 ? (
                <div className="space-y-4">
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✅</span>
                      <span>Incluído no plano</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">❌</span>
                      <span>Não incluído</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-200 rounded"></div>
                      <span>Com coparticipação</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-200 rounded"></div>
                      <span>Valor final do cliente</span>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b">
                              Procedimento
                            </th>
                            {coverage.length > 0 && coverage[0]?.planCoverage.map(plan => (
                              <th key={plan.planId} className="px-6 py-3 text-center text-sm font-medium text-gray-900 border-b">
                                <div className="flex flex-col">
                                  <span className="font-semibold">{plan.planName}</span>
                                  <span className="text-xs text-gray-500 font-normal">Cobertura</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredCoverage.map((item, index) => (
                            <tr key={item.procedure.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-4 py-4">
                                <div>
                                  <div className="font-medium text-gray-900">{item.procedure.name}</div>
                                  {item.procedure.description && (
                                    <div className="text-xs text-gray-500 mt-1 max-w-xs">{item.procedure.description}</div>
                                  )}
                                </div>
                              </td>
                              {item.planCoverage.map(plan => (
                                <td key={plan.planId} className="px-6 py-4">
                                  <div className="flex flex-col items-center space-y-2">
                                    {/* Status Icon */}
                                    <div className="flex items-center justify-center">
                                      <span className="text-xl">
                                        {plan.isIncluded ? "✅" : "❌"}
                                      </span>
                                    </div>
                                    
                                    {plan.isIncluded && (
                                      <div className="text-center space-y-1 min-w-[120px]">
                                        {/* Procedure Price */}
                                        {plan.price > 0 && (
                                          <div className="text-xs text-gray-600">
                                            <span className="font-medium">Valor Proc.:</span><br/>
                                            <span className="text-blue-600 font-semibold">
                                              {formatCurrency((plan.price / 100).toString())}
                                            </span>
                                          </div>
                                        )}
                                        
                                        {/* Coparticipação */}
                                        {plan.coparticipacao > 0 && (
                                          <div className="text-xs bg-orange-50 border border-orange-200 rounded px-2 py-1">
                                            <span className="text-orange-700 font-medium">Copart.:</span><br/>
                                            <span className="text-orange-600 font-semibold">
                                              - {formatCurrency((plan.coparticipacao / 100).toString())}
                                            </span>
                                          </div>
                                        )}
                                        
                                        {/* Final Value */}
                                        {plan.payValue > 0 && (
                                          <div className="text-xs bg-green-50 border border-green-200 rounded px-2 py-1">
                                            <span className="text-green-700 font-medium">Cliente paga:</span><br/>
                                            <span className="text-green-600 font-semibold">
                                              {formatCurrency((plan.payValue / 100).toString())}
                                            </span>
                                          </div>
                                        )}
                                        
                                        {/* Free procedure */}
                                        {plan.price === 0 && plan.payValue === 0 && plan.coparticipacao === 0 && (
                                          <div className="text-xs text-green-600 font-medium bg-green-50 border border-green-200 rounded px-2 py-1">
                                            Gratuito
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {!plan.isIncluded && (
                                      <div className="text-xs text-gray-500 text-center">
                                        Não coberto
                                      </div>
                                    )}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Results Summary */}
                  <div className="text-sm text-gray-600 text-center bg-gray-50 p-3 rounded-lg">
                    Mostrando {filteredCoverage.length} de {coverage.length} procedimentos
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma cobertura encontrada</h3>
                    <p className="text-gray-500 mb-4">
                      Não foi possível carregar a tabela de cobertura. Verifique se existem procedimentos e planos cadastrados.
                    </p>
                    <Button onClick={loadCoverage} variant="outline" size="sm">
                      Tentar novamente
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Guide Details Modal */}
        {selectedGuide && (
          <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedGuide.procedure}</CardTitle>
                    <CardDescription>
                      Criada em {new Date(selectedGuide.createdAt).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedGuide(null)}>
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-primary">Cliente</Label>
                    <p className="text-sm text-foreground">{selectedGuide.client?.name}</p>
                    <p className="text-sm text-foreground">{selectedGuide.client?.email}</p>
                    <p className="text-sm text-foreground">{formatBrazilianPhoneForDisplay(selectedGuide.client?.phone)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-primary">Pet</Label>
                    <p className="text-sm text-foreground">{selectedGuide.pet?.name}</p>
                    <p className="text-sm text-foreground">
                      {selectedGuide.pet?.species} - {selectedGuide.pet?.breed}
                    </p>
                  </div>
                </div>
                
                {selectedGuide.procedureNotes && (
                  <div>
                    <Label className="text-sm font-medium text-primary">Observações do Procedimento</Label>
                    <p className="text-sm text-foreground">{selectedGuide.procedureNotes}</p>
                  </div>
                )}

                {selectedGuide.generalNotes && (
                  <div>
                    <Label className="text-sm font-medium text-primary">Observações Gerais</Label>
                    <p className="text-sm text-foreground">{selectedGuide.generalNotes}</p>
                  </div>
                )}

                {selectedGuide.value && (
                  <div>
                    <Label className="text-sm font-medium text-primary">Valor</Label>
                    <p className="text-sm font-medium text-green-600">
                      {formatCurrency(selectedGuide.value)}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-primary">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedGuide.unitStatus || "open")}
                  </div>
                </div>

                {selectedGuide.unitStatus === "open" && (
                  <div className="flex space-x-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateGuideStatus(selectedGuide.id, "closed")}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aceitar Atendimento
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateGuideStatus(selectedGuide.id, "cancelled")}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeitar Atendimento
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}