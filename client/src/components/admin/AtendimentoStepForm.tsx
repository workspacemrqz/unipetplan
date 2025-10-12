import React from "react";
import { StepForm } from "@/components/ui/step-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Users, Cat, Clipboard, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Plus, AlertCircle } from "lucide-react";

interface AtendimentoStepFormProps {
  atendimentoForm: {
    clientId: string;
    petId: string;
    procedure: string;
    procedureId: string;
    procedureNotes: string;
    generalNotes: string;
    coparticipacao: string;
    receber: string;
  };
  setAtendimentoForm: React.Dispatch<React.SetStateAction<any>>;
  availableClients: any[];
  availablePets: any[];
  availableProcedures: any[];
  loadingProcedures: boolean;
  selectedPetData: any;
  calculatedValues: any;
  loadingCalculation: boolean;
  handleClientChange: (clientId: string) => void;
  handlePetChange: (petId: string) => void;
  handleProcedureChange: (procedureId: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submittingAtendimento: boolean;
}

export function AtendimentoStepForm({
  atendimentoForm,
  setAtendimentoForm,
  availableClients,
  availablePets,
  availableProcedures,
  loadingProcedures,
  selectedPetData,
  calculatedValues,
  loadingCalculation,
  handleClientChange,
  handlePetChange,
  handleProcedureChange,
  onSubmit,
  onCancel,
  submittingAtendimento
}: AtendimentoStepFormProps) {
  const steps = [
    {
      id: "client",
      title: "Cliente",
      description: "Selecione o cliente para o atendimento",
      icon: <Users className="w-4 h-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client" className="text-sm font-medium">
                  Cliente <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={atendimentoForm.clientId} 
                  onValueChange={handleClientChange}
                >
                  <SelectTrigger
                    className="w-full [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                    style={{
                      borderColor: 'var(--border-gray)',
                      background: 'white'
                    }}
                  >
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.flatMap((client, index, array) => [
                      <SelectItem 
                        key={client.id} 
                        value={client.id} 
                        className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                      >
                        {client.fullName} - {client.cpf}
                      </SelectItem>,
                      ...(index < array.length - 1 ? [<Separator key={`separator-${client.id}`} />] : [])
                    ])}
                  </SelectContent>
                </Select>
                {!atendimentoForm.clientId && availableClients.length === 0 && (
                  <p className="text-xs text-gray-500">Nenhum cliente disponível</p>
                )}
              </div>
              
              {atendimentoForm.clientId && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Cliente selecionado: {availableClients.find(c => c.id === atendimentoForm.clientId)?.fullName}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      ),
      validation: () => {
        return !!atendimentoForm.clientId;
      }
    },
    {
      id: "pet",
      title: "Pet",
      description: "Selecione o pet do cliente para o atendimento",
      icon: <Cat className="w-4 h-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pet" className="text-sm font-medium">
                  Pet <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={atendimentoForm.petId} 
                  onValueChange={handlePetChange}
                  disabled={!atendimentoForm.clientId}
                >
                  <SelectTrigger
                    className="w-full [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                    style={{
                      borderColor: 'var(--border-gray)',
                      background: 'white'
                    }}
                  >
                    <SelectValue placeholder="Selecione um pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePets.flatMap((pet, index, array) => [
                      <SelectItem 
                        key={pet.id} 
                        value={pet.id} 
                        className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                      >
                        {pet.name} - {pet.species} {pet.breed ? `(${pet.breed})` : ''}
                      </SelectItem>,
                      ...(index < array.length - 1 ? [<Separator key={`separator-${pet.id}`} />] : [])
                    ])}
                  </SelectContent>
                </Select>
                {!atendimentoForm.clientId && (
                  <p className="text-xs text-gray-500">Selecione um cliente primeiro</p>
                )}
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
            </div>
          </CardContent>
        </Card>
      ),
      validation: () => {
        return !!atendimentoForm.petId;
      }
    },
    {
      id: "procedure",
      title: "Procedimento",
      description: "Selecione o procedimento e defina valores",
      icon: <Clipboard className="w-4 h-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Procedure Selection */}
              <div className="space-y-2">
                <Label htmlFor="procedure" className="text-sm font-medium">
                  Procedimento <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={atendimentoForm.procedureId} 
                  onValueChange={handleProcedureChange}
                  disabled={!atendimentoForm.petId || loadingProcedures}
                >
                  <SelectTrigger
                    className="w-full [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                    style={{
                      borderColor: 'var(--border-gray)',
                      background: 'white'
                    }}
                  >
                    <SelectValue placeholder={loadingProcedures ? "Carregando procedimentos..." : "Selecione um procedimento"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProcedures.flatMap((procedure, index, array) => [
                      <SelectItem 
                        key={procedure.id} 
                        value={procedure.id} 
                        className="py-3 pl-10 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                      >
                        {procedure.name}
                        {procedure.description && (
                          <span className="text-xs text-gray-500 block">{procedure.description}</span>
                        )}
                      </SelectItem>,
                      ...(index < array.length - 1 ? [<Separator key={`separator-${procedure.id}`} />] : [])
                    ])}
                  </SelectContent>
                </Select>
                {!atendimentoForm.petId && (
                  <p className="text-xs text-gray-500">Selecione um pet primeiro</p>
                )}
              </div>

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
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
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
                    value={atendimentoForm.coparticipacao}
                    onChange={(e) => setAtendimentoForm((prev: any) => ({ ...prev, coparticipacao: e.target.value }))}
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
                    value={atendimentoForm.receber}
                    onChange={(e) => setAtendimentoForm((prev: any) => ({ ...prev, receber: e.target.value }))}
                    className={calculatedValues ? "bg-gray-50" : ""}
                  />
                  {calculatedValues && (
                    <p className="text-xs text-gray-500">
                      Valor a receber da unidade. Pode ser ajustado se necessário.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ),
      validation: () => {
        return !!atendimentoForm.procedureId;
      }
    },
    {
      id: "notes",
      title: "Observações",
      description: "Adicione observações sobre o atendimento",
      icon: <FileText className="w-4 h-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="procedureNotes" className="text-sm font-medium">
                  Observações do Procedimento
                </Label>
                <Textarea
                  id="procedureNotes"
                  placeholder="Detalhes específicos sobre o procedimento..."
                  rows={4}
                  value={atendimentoForm.procedureNotes}
                  onChange={(e) => setAtendimentoForm((prev: any) => ({ ...prev, procedureNotes: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="generalNotes" className="text-sm font-medium">
                  Observações Gerais
                </Label>
                <Textarea
                  id="generalNotes"
                  placeholder="Informações adicionais, contexto, etc..."
                  rows={4}
                  value={atendimentoForm.generalNotes}
                  onChange={(e) => setAtendimentoForm((prev: any) => ({ ...prev, generalNotes: e.target.value }))}
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Resumo do Atendimento</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium">{availableClients.find(c => c.id === atendimentoForm.clientId)?.fullName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pet:</span>
                    <span className="font-medium">{availablePets.find(p => p.id === atendimentoForm.petId)?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Procedimento:</span>
                    <span className="font-medium">{availableProcedures.find(p => p.id === atendimentoForm.procedureId)?.name || '-'}</span>
                  </div>
                  {atendimentoForm.coparticipacao && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Coparticipação:</span>
                      <span className="font-medium">R$ {atendimentoForm.coparticipacao}</span>
                    </div>
                  )}
                  {atendimentoForm.receber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">A Receber:</span>
                      <span className="font-medium">R$ {atendimentoForm.receber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ),
      validation: () => {
        return true; // Notes are optional
      }
    }
  ];

  return (
    <StepForm
      steps={steps}
      onComplete={onSubmit}
      onCancel={onCancel}
      submitButtonText="Criar Atendimento"
      isSubmitting={submittingAtendimento}
    />
  );
}