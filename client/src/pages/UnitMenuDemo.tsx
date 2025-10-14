import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function UnitMenuDemo() {
  const unitNavigation = [
    {
      name: "Principal",
      items: [
        { name: "Dashboard", iconName: "Dashboard" }
      ]
    },
    {
      name: "Atendimentos",
      items: [
        { name: "Atendimentos", iconName: "Atendimento" },
        { name: "Novo Atendimento", iconName: "Atendimento" }
      ]
    },
    {
      name: "Gestão",
      items: [
        { name: "Procedimentos", iconName: "Procedimento" },
        { name: "Corpo Clínico", iconName: "Admin" }
      ]
    },
    {
      name: "Financeiro",
      items: [
        { name: "Relatório Financeiro", iconName: "Pagamento" }
      ]
    },
    {
      name: "Sistema",
      items: [
        { name: "Logs de Ações", iconName: "LogsList" }
      ]
    }
  ];

  const adminNavigation = {
    name: "Configurações",
    items: [
      { name: "Planos de Saúde", iconName: "Plano de saúde" },
      { name: "Procedimentos", iconName: "Procedimento" },
      { name: "FAQ", iconName: "FAQ" },
      { name: "Administração", iconName: "Admin" },
      { name: "Logs de Ações", iconName: "LogsList" },
      { name: "Configurações", iconName: "Configurações" }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao início
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6">Alteração do Ícone "Corpo Clínico"</h1>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <p className="text-sm text-blue-700">
              <strong>Alteração implementada:</strong>
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-blue-700">
              <li>O botão "Corpo Clínico" no menu da unidade agora usa o mesmo ícone do botão "Administração" do menu admin</li>
              <li>Ambos compartilham o ícone "Admin"</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Unit Menu */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-4 text-primary">Menu Unidade (/unidade)</h2>
              <div className="space-y-4">
                {unitNavigation.map((section) => (
                  <div key={section.name}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {section.name}
                    </h3>
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <div
                          key={item.name}
                          className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                            item.name === "Corpo Clínico"
                              ? "bg-primary text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <img 
                            src={`/Icons/${item.iconName}.svg`} 
                            alt={item.name}
                            className={`h-5 w-5 mr-3 inline-block ${
                              item.name === "Corpo Clínico"
                                ? "[filter:brightness(0)_saturate(100%)_invert(1)]"
                                : "[filter:brightness(0)_saturate(100%)_opacity(0.5)]"
                            }`}
                          />
                          <span className={item.name === "Corpo Clínico" ? "font-semibold" : ""}>
                            {item.name}
                          </span>
                          {item.name === "Corpo Clínico" && (
                            <span className="ml-auto text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded">
                              Ícone Atualizado!
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Reference */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-4 text-primary">Menu Admin (/admin) - Referência</h2>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {adminNavigation.name}
                </h3>
                {adminNavigation.items.map((item) => (
                  <div
                    key={item.name}
                    className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      item.name === "Administração"
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <img 
                      src={`/Icons/${item.iconName}.svg`} 
                      alt={item.name}
                      className={`h-5 w-5 mr-3 inline-block ${
                        item.name === "Administração"
                          ? "[filter:brightness(0)_saturate(100%)_invert(1)]"
                          : "[filter:brightness(0)_saturate(100%)_opacity(0.5)]"
                      }`}
                    />
                    <span className={item.name === "Administração" ? "font-semibold" : ""}>
                      {item.name}
                    </span>
                    {item.name === "Administração" && (
                      <span className="ml-auto text-xs bg-green-400 text-green-900 px-2 py-1 rounded">
                        Mesmo Ícone
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-purple-50 border-l-4 border-purple-400">
            <p className="text-sm text-purple-700 mb-2">
              <strong>Comparação Visual:</strong>
            </p>
            <div className="flex items-center justify-center space-x-8 mt-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Ícone "Admin"</p>
                <div className="bg-white p-4 rounded border flex items-center space-x-2">
                  <img 
                    src="/Icons/Admin.svg" 
                    alt="Admin Icon"
                    className="h-12 w-12"
                  />
                  <div className="text-left text-sm">
                    <p className="font-semibold">Usado em:</p>
                    <p className="text-gray-600">• Administração (Admin)</p>
                    <p className="text-gray-600">• Corpo Clínico (Unidade)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-400">
            <p className="text-sm text-green-700">
              <strong>Como verificar:</strong>
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-green-700">
              <li>Acesse <code className="bg-green-100 px-1 rounded">/unidade/[slug]/corpo-clinico</code> e veja o menu lateral</li>
              <li>Compare com <code className="bg-green-100 px-1 rounded">/admin/administracao</code> - os ícones são idênticos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}