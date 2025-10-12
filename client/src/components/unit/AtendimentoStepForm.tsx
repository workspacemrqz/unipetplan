import React, { useState } from "react";
import { StepForm } from "@/components/ui/step-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Users, Heart, Clipboard, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Info } from "lucide-react";

interface AtendimentoUnitStepFormProps {
  form: any;
  cpfSearch: string;
  setCpfSearch: (value: string) => void;
  selectedClient: any;
  clientPets: any[];
  availableProcedures: any;
  proceduresLoading: boolean;
  procedureSearch: string;
  setProcedureSearch: (value: string) => void;
  isSearchingClient: boolean;
  formatCpf: (value: string) => string;
  unitInfo: any;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function AtendimentoUnitStepForm({
  form,
  cpfSearch,
  setCpfSearch,
  selectedClient,
  clientPets,
  availableProcedures,
  proceduresLoading,
  procedureSearch,
  setProcedureSearch,
  isSearchingClient,
  formatCpf,
  unitInfo,
  onSubmit,
  onCancel,
  isSubmitting
}: AtendimentoUnitStepFormProps) {
  
  const steps = [
    {
      id: "client",
      title: "Cliente",
      description: "Busque o cliente pelo CPF",
      icon: <Users className="w-4 h-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <FormLabel>Cliente (CPF) *</FormLabel>
                <div className="relative">
                  <Input
                    placeholder="000.000.000-00"
                    value={cpfSearch}
                    onChange={(e) => setCpfSearch(formatCpf(e.target.value))}
                    maxLength={14}
                    className="h-12"
                    style={{
                      borderColor: 'var(--border-gray)',
                      background: 'white'
                    }}
                  />
                  {isSearchingClient && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Digite o CPF completo para buscar o cliente
                </p>
              </div>

              {selectedClient && (
                <Alert className="bg-green-50 border-green-200">
                  <Info className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    <strong>Cliente encontrado:</strong> {selectedClient.fullName}
                  </AlertDescription>
                </Alert>
              )}
              
              {cpfSearch.replace(/\D/g, '').length === 11 && !selectedClient && !isSearchingClient && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertDescription className="text-red-900">
                    Cliente não encontrado com este CPF
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      ),
      validation: () => {
        return !!selectedClient;
      }
    },
    {
      id: "pet",
      title: "Pet",
      description: "Selecione o pet do cliente",
      icon: <Heart className="w-4 h-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="petId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet *</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("procedure", "");
                        form.setValue("generalNotes", "");
                        form.setValue("value", "");
                      }} 
                      value={field.value}
                      disabled={!selectedClient || clientPets.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger 
                          style={{
                            borderColor: 'var(--border-gray)',
                            background: 'white'
                          }}
                        >
                          <SelectValue placeholder={
                            !selectedClient ? "Busque um cliente primeiro" :
                            clientPets.length === 0 ? "Cliente sem pets cadastrados" :
                            "Selecione o pet"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientPets.flatMap((pet, index) => [
                          <SelectItem 
                            key={pet.id} 
                            value={pet.id}
                            className="py-3 pl-8 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                          >
                            {pet.name} ({pet.species})
                          </SelectItem>,
                          ...(index < clientPets.length - 1 ? [<Separator key={`separator-${pet.id}`} />] : [])
                        ])}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("petId") && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Pet selecionado: {clientPets.find(p => p.id === form.watch("petId"))?.name}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      ),
      validation: () => {
        return !!form.getValues("petId");
      }
    },
    {
      id: "procedure",
      title: "Procedimento",
      description: "Selecione o procedimento a ser realizado",
      icon: <Clipboard className="w-4 h-4" />,
      content: (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Rede Credenciada - Pre-filled and disabled */}
              <FormField
                control={form.control}
                name="networkUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rede Credenciada *</FormLabel>
                    <div>
                      <Input
                        value={unitInfo?.name || 'Carregando...'}
                        disabled
                        className="h-12"
                        style={{
                          borderColor: 'var(--border-gray)',
                          background: '#f5f5f5',
                          cursor: 'not-allowed'
                        }}
                      />
                      <input type="hidden" {...field} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      A unidade é pré-selecionada automaticamente
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Procedimento */}
              <FormField
                control={form.control}
                name="procedure"
                render={({ field }) => {
                  const filteredProcedures = availableProcedures?.procedures?.filter((proc: any) => 
                    proc.name.toLowerCase().includes(procedureSearch.toLowerCase())
                  ) || [];

                  return (
                    <FormItem>
                      <FormLabel>Procedimento *</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setProcedureSearch("");
                          const selectedProc = availableProcedures?.procedures?.find((p: any) => p.name === value);
                          if (selectedProc) {
                            const coparticipationValue = selectedProc.coparticipation || 0;
                            form.setValue("value", coparticipationValue.toFixed(2).replace('.', ','));
                          }
                        }} 
                        value={field.value} 
                        disabled={!form.watch("petId") || proceduresLoading}
                      >
                        <FormControl>
                          <SelectTrigger 
                            className="[&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                            style={{
                              borderColor: 'var(--border-gray)',
                              background: 'white'
                            }}
                          >
                            <SelectValue placeholder={
                              !form.watch("petId") ? "Selecione um pet primeiro" : 
                              proceduresLoading ? "Carregando procedimentos..." :
                              availableProcedures?.procedures?.length === 0 ? "Nenhum procedimento disponível" :
                              "Selecione o procedimento"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <div className="p-2 border-b">
                            <Input
                              placeholder="Digite para buscar..."
                              value={procedureSearch}
                              onChange={(e) => setProcedureSearch(e.target.value)}
                              className="h-8"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          
                          {filteredProcedures.length > 0 ? (
                            filteredProcedures.flatMap((proc: any, index: number, array: any[]) => [
                              <SelectItem 
                                key={proc.id} 
                                value={proc.name} 
                                className="py-3 pl-8 pr-4 data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground"
                              >
                                <div className="flex flex-col">
                                  <span>{proc.name}</span>
                                  <span className="text-xs">
                                    Limite: {proc.remaining}/{proc.annualLimit} restantes
                                  </span>
                                </div>
                              </SelectItem>,
                              ...(index < array.length - 1 ? [<Separator key={`separator-${proc.id}`} />] : [])
                            ])
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground">
                              {!form.watch("petId") ? "Selecione um pet primeiro" :
                               procedureSearch ? "Nenhum procedimento encontrado" :
                               availableProcedures?.message || "Nenhum procedimento disponível"}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {field.value && (
                        <p className="text-sm text-primary mt-1">
                          Coparticipação: {form.getValues("value") === "0,00" ? "Sem coparticipação" : `R$ ${form.getValues("value")}`}
                        </p>
                      )}
                    </FormItem>
                  );
                }}
              />
            </div>
          </CardContent>
        </Card>
      ),
      validation: () => {
        return !!form.getValues("procedure");
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
              <FormField
                control={form.control}
                name="generalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Gerais (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Adicione observações ou informações adicionais..."
                        className="min-h-[100px]"
                        style={{
                          borderColor: 'var(--border-gray)',
                          background: 'white'
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Resumo do Atendimento</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium">{selectedClient?.fullName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pet:</span>
                    <span className="font-medium">
                      {clientPets.find(p => p.id === form.watch("petId"))?.name || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Procedimento:</span>
                    <span className="font-medium">{form.watch("procedure") || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unidade:</span>
                    <span className="font-medium">{unitInfo?.name || '-'}</span>
                  </div>
                  {form.watch("value") && form.watch("value") !== "0,00" && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Coparticipação:</span>
                      <span className="font-medium">R$ {form.watch("value")}</span>
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
      isSubmitting={isSubmitting}
    />
  );
}