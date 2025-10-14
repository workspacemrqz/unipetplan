import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function MenuLogsDemo() {
  // Mock navigation structures
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

  const unitNavigation = {
    name: "Sistema",
    items: [
      { name: "Logs de Ações", iconName: "LogsList" }
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
          <h1 className="text-3xl font-bold mb-6">Demonstração do Novo Ícone de Logs</h1>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
            <p className="text-sm text-blue-700">
              <strong>Alterações implementadas:</strong>
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-blue-700">
              <li>Novo ícone para "Logs de Ações" no menu admin</li>
              <li>Novo ícone para "Logs de Ações" no menu de unidades</li>
              <li>O ícone é uma lista com bullets que representa melhor a funcionalidade</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Admin Menu Preview */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-4 text-primary">Menu Admin (/admin)</h2>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {adminNavigation.name}
                </h3>
                {adminNavigation.items.map((item) => (
                  <div
                    key={item.name}
                    className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      item.name === "Logs de Ações" 
                        ? "bg-primary text-white" 
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <img 
                      src={`/Icons/${item.iconName}.svg`} 
                      alt={item.name}
                      className={`h-5 w-5 mr-3 inline-block ${
                        item.name === "Logs de Ações" 
                          ? "[filter:brightness(0)_saturate(100%)_invert(1)]" 
                          : "[filter:brightness(0)_saturate(100%)_opacity(0.5)]"
                      }`}
                    />
                    <span className={item.name === "Logs de Ações" ? "font-semibold" : ""}>
                      {item.name}
                    </span>
                    {item.name === "Logs de Ações" && (
                      <span className="ml-auto text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded">
                        Novo Ícone!
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Unit Menu Preview */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-4 text-primary">Menu Unidade (/unidade)</h2>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {unitNavigation.name}
                </h3>
                {unitNavigation.items.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center px-3 py-2 text-sm rounded-lg transition-colors bg-primary text-white"
                  >
                    <img 
                      src={`/Icons/${item.iconName}.svg`} 
                      alt={item.name}
                      className="h-5 w-5 mr-3 inline-block [filter:brightness(0)_saturate(100%)_invert(1)]"
                    />
                    <span className="font-semibold">{item.name}</span>
                    <span className="ml-auto text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded">
                      Novo Ícone!
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">Visualização do Ícone SVG:</h3>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Original (cinza)</p>
                <div className="bg-white p-4 rounded border">
                  <img 
                    src="/Icons/LogsList.svg" 
                    alt="LogsList Icon"
                    className="h-12 w-12"
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Ativo (branco invertido)</p>
                <div className="bg-primary p-4 rounded border">
                  <img 
                    src="/Icons/LogsList.svg" 
                    alt="LogsList Icon Active"
                    className="h-12 w-12 [filter:brightness(0)_saturate(100%)_invert(1)]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-green-50 border-l-4 border-green-400">
            <p className="text-sm text-green-700">
              <strong>Como verificar nos ambientes reais:</strong>
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-green-700">
              <li>Acesse <code className="bg-green-100 px-1 rounded">/admin/logs</code> para ver no menu admin</li>
              <li>Acesse <code className="bg-green-100 px-1 rounded">/unidade/[slug]/logs</code> para ver no menu da unidade</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}