import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function NovoAtendimentoIconDemo() {
  const unitNavigation = {
    name: "Atendimentos",
    items: [
      { name: "Atendimentos", iconName: "Atendimento" },
      { name: "Novo Atendimento", iconName: "Plus" }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao início
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6">Novo Ícone: "Novo Atendimento"</h1>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <p className="text-sm text-blue-700">
              <strong>Alteração implementada:</strong>
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-blue-700">
              <li>O botão "Novo Atendimento" agora usa um ícone de "+" (plus/adicionar)</li>
              <li>Representa claramente a ação de criar/adicionar um novo atendimento</li>
              <li>Aplicado tanto no menu de veterinários quanto no menu completo da unidade</li>
            </ul>
          </div>

          <div className="border rounded-lg p-6 bg-gray-50 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-primary">Menu Unidade - Seção Atendimentos</h2>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {unitNavigation.name}
              </h3>
              {unitNavigation.items.map((item) => (
                <div
                  key={item.name}
                  className={`flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    item.name === "Novo Atendimento"
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <img 
                    src={`/Icons/${item.iconName}.svg`} 
                    alt={item.name}
                    className={`h-5 w-5 mr-3 inline-block ${
                      item.name === "Novo Atendimento"
                        ? "[filter:brightness(0)_saturate(100%)_invert(1)]"
                        : "[filter:brightness(0)_saturate(100%)_opacity(0.5)]"
                    }`}
                  />
                  <span className={item.name === "Novo Atendimento" ? "font-semibold" : ""}>
                    {item.name}
                  </span>
                  {item.name === "Novo Atendimento" && (
                    <span className="ml-auto text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded font-medium">
                      Novo Ícone!
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold mb-3 text-purple-900">Ícone Anterior</h3>
              <div className="flex items-center space-x-3 bg-white p-3 rounded">
                <img 
                  src="/Icons/Atendimento.svg" 
                  alt="Atendimento Icon"
                  className="h-10 w-10"
                />
                <div className="text-sm">
                  <p className="font-medium text-gray-700">Atendimento</p>
                  <p className="text-gray-500 text-xs">Ícone anterior usado</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold mb-3 text-green-900">Ícone Novo</h3>
              <div className="flex items-center space-x-3 bg-white p-3 rounded">
                <img 
                  src="/Icons/Plus.svg" 
                  alt="Plus Icon"
                  className="h-10 w-10"
                />
                <div className="text-sm">
                  <p className="font-medium text-gray-700">Plus (+)</p>
                  <p className="text-gray-500 text-xs">Ícone atual usado</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-amber-50 border-l-4 border-amber-400">
            <p className="text-sm text-amber-800 mb-2">
              <strong>Visualização do Ícone "+":</strong>
            </p>
            <div className="flex items-center justify-center space-x-8 mt-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Estado Inativo</p>
                <div className="bg-white p-4 rounded border">
                  <img 
                    src="/Icons/Plus.svg" 
                    alt="Plus Icon"
                    className="h-16 w-16 [filter:brightness(0)_saturate(100%)_opacity(0.5)]"
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Estado Ativo</p>
                <div className="bg-primary p-4 rounded border border-primary">
                  <img 
                    src="/Icons/Plus.svg" 
                    alt="Plus Icon Active"
                    className="h-16 w-16 [filter:brightness(0)_saturate(100%)_invert(1)]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-400">
            <p className="text-sm text-green-700">
              <strong>Como verificar nos menus reais:</strong>
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-green-700">
              <li>Acesse <code className="bg-green-100 px-1 rounded">/unidade/[slug]/atendimentos</code> e veja o menu lateral</li>
              <li>O botão "Novo Atendimento" agora exibe o ícone de "+"</li>
              <li>Funciona tanto para veterinários quanto para o menu completo da unidade</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}