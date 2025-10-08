import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Procedure {
  id: string;
  name: string;
  type: string;
  annualLimit: number;
  used: number;
  remaining: number;
  canUse: boolean;
  waitingDaysRemaining?: number;
  waitingDaysTotal?: number;
  coparticipation?: number;
  petCreatedAt?: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  planName: string;
  planId: string | null;
  procedures: Procedure[];
}

interface ProcedureUsageData {
  year: number;
  pets: Pet[];
  message: string;
}

export function ProceduresTab() {
  const [loading, setLoading] = useState(false);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [procedureData, setProcedureData] = useState<ProcedureUsageData | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch procedure usage data
  const fetchProcedureUsage = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/clients/procedure-usage', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar dados de procedimentos');
      }

      const data = await response.json();
      setProcedureData(data);

      // Auto-select first pet if available
      if (data.pets.length > 0 && !selectedPet) {
        setSelectedPet(data.pets[0].id);
      }
    } catch (error) {
      console.error('Error fetching procedure usage:', error);
      toast.error('Erro ao carregar dados de procedimentos');
    } finally {
      setLoading(false);
    }
  };

  // Removed manual registration - usage is now tracked automatically when guides are created

  useEffect(() => {
    fetchProcedureUsage();
  }, []);

  const selectedPetData = procedureData?.pets.find(pet => pet.id === selectedPet);
  
  // Filter procedures based on search term
  const filteredProcedures = selectedPetData?.procedures.filter(procedure =>
    procedure.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading && !procedureData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando procedimentos...</p>
        </div>
      </div>
    );
  }

  if (!procedureData || procedureData.pets.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Nenhum pet cadastrado</AlertTitle>
        <AlertDescription>
          Você ainda não possui pets cadastrados com planos ativos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pet Selection */}
      <div className="w-full sm:w-[250px]">
        <Select value={selectedPet} onValueChange={setSelectedPet}>
          <SelectTrigger 
            className="w-full p-3 rounded-lg border text-sm"
            style={{
              borderColor: 'var(--border-gray)',
              background: 'white'
            }}
          >
            <SelectValue placeholder="Selecione um pet" />
          </SelectTrigger>
          <SelectContent>
            {procedureData.pets.map((pet) => (
              <SelectItem key={pet.id} value={pet.id}>
                {pet.name} - {pet.species} ({pet.planName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search Filter */}
      {selectedPetData && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Busca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Procedures List */}
          {selectedPetData.procedures.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sem procedimentos com limite</AlertTitle>
              <AlertDescription>
                Este plano não possui procedimentos com limites anuais definidos.
              </AlertDescription>
            </Alert>
          ) : filteredProcedures.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Nenhum procedimento encontrado</AlertTitle>
              <AlertDescription>
                Não foi encontrado nenhum procedimento com o termo "{searchTerm}".
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedimento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Limite Anual</TableHead>
                      <TableHead className="text-center">Limite Anual Restante</TableHead>
                      <TableHead className="text-center">Carência</TableHead>
                      <TableHead className="text-center">Coparticipação</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProcedures.map((procedure) => (
                        <TableRow key={procedure.id}>
                          <TableCell className="font-medium">{procedure.name}</TableCell>
                          <TableCell>
                            <Badge variant="neutral" className="text-xs">
                              {procedure.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{procedure.annualLimit}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="neutral" className="text-xs">
                              {procedure.remaining}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {procedure.waitingDaysRemaining && procedure.waitingDaysRemaining > 0 ? (
                              <Badge variant="neutral" className="text-xs">
                                {procedure.waitingDaysRemaining} {procedure.waitingDaysRemaining === 1 ? 'dia' : 'dias'}
                              </Badge>
                            ) : (
                              <Badge variant="neutral" className="text-xs">
                                Liberado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {procedure.coparticipation && procedure.coparticipation > 0 ? (
                              <span className="text-sm font-medium">
                                R$ {procedure.coparticipation.toFixed(2).replace('.', ',')}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {procedure.waitingDaysRemaining && procedure.waitingDaysRemaining > 0 ? (
                              <Badge variant="neutral" className="text-xs">
                                Em carência
                              </Badge>
                            ) : procedure.remaining > 0 ? (
                              <Badge variant="neutral" className="text-xs">
                                Disponível
                              </Badge>
                            ) : (
                              <Badge variant="neutral" className="text-xs">
                                Limite atingido
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}