import { useLocation } from "wouter";
import SteppedAtendimentoForm from "@/components/shared/SteppedAtendimentoForm";

export default function AtendimentoForm() {
  const [, setLocation] = useLocation();

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground break-words">
          Novo Atendimento
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Siga as etapas para criar um novo atendimento
        </p>
      </div>

      {/* Stepped Form */}
      <SteppedAtendimentoForm
        mode="admin"
        onSuccess={() => setLocation("/atendimentos")}
      />
    </div>
  );
}