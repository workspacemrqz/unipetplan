import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { SvgIcon } from "@/components/ui/SvgIcon";
import CustomIcon from "@/components/admin/ui/CustomIcon";

export default function LogsIconFixDemo() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao início
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6">Correção do Ícone "Logs de Ações"</h1>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8">
            <p className="text-sm text-green-700">
              <strong>✅ Problema Corrigido!</strong>
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-green-700">
              <li>O arquivo SVG foi atualizado para usar `fill="currentColor"` em vez de uma cor fixa</li>
              <li>O componente SvgIcon foi ajustado para aplicar filtros CSS corretos</li>
              <li>Agora o ícone funciona corretamente tanto no menu admin quanto no menu unidade</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Menu Unidade */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-4 text-primary">Menu Unidade (/unidade)</h2>
              <p className="text-sm text-gray-600 mb-4">Usando componente SvgIcon</p>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sistema</h3>
                
                {/* Estado Inativo */}
                <div className="flex items-center px-3 py-2.5 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                  <SvgIcon 
                    name="LogsList" 
                    className="h-5 w-5 mr-3 opacity-60"
                  />
                  <span>Logs de Ações (Inativo)</span>
                </div>
                
                {/* Estado Ativo */}
                <div className="flex items-center px-3 py-2.5 text-sm rounded-lg bg-primary text-white">
                  <SvgIcon 
                    name="LogsList" 
                    className="h-5 w-5 mr-3 invert"
                  />
                  <span className="font-semibold">Logs de Ações (Ativo)</span>
                </div>
              </div>
            </div>

            {/* Menu Admin */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-4 text-primary">Menu Admin (/admin)</h2>
              <p className="text-sm text-gray-600 mb-4">Usando componente CustomIcon</p>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Configurações</h3>
                
                {/* Estado Inativo */}
                <div className="flex items-center px-3 py-2.5 text-sm rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                  <CustomIcon 
                    name="LogsList" 
                    color="gray"
                    className="h-5 w-5 mr-3"
                  />
                  <span>Logs de Ações (Inativo)</span>
                </div>
                
                {/* Estado Ativo */}
                <div className="flex items-center px-3 py-2.5 text-sm rounded-lg bg-primary text-white">
                  <CustomIcon 
                    name="LogsList" 
                    color="white"
                    className="h-5 w-5 mr-3"
                  />
                  <span className="font-semibold">Logs de Ações (Ativo)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-sm text-yellow-800 mb-2">
              <strong>Teste Visual do Ícone:</strong>
            </p>
            <div className="flex items-center justify-center space-x-8 mt-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Original (sem filtros)</p>
                <div className="bg-white p-4 rounded border">
                  <img 
                    src="/Icons/LogsList.svg" 
                    alt="LogsList Icon"
                    className="h-12 w-12"
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Com filtro (preto)</p>
                <div className="bg-white p-4 rounded border">
                  <img 
                    src="/Icons/LogsList.svg" 
                    alt="LogsList Icon Black"
                    className="h-12 w-12"
                    style={{ filter: "brightness(0) saturate(100%)" }}
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Com filtro invertido (branco)</p>
                <div className="bg-primary p-4 rounded border">
                  <img 
                    src="/Icons/LogsList.svg" 
                    alt="LogsList Icon White"
                    className="h-12 w-12"
                    style={{ filter: "brightness(0) saturate(100%) invert(1)" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-400">
            <p className="text-sm text-green-700">
              <strong>Como verificar nas rotas reais:</strong>
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-green-700">
              <li>Acesse <code className="bg-green-100 px-1 rounded">/unidade/[slug]/logs</code> - O ícone deve aparecer corretamente</li>
              <li>Acesse <code className="bg-green-100 px-1 rounded">/admin/logs</code> - O ícone também deve aparecer corretamente</li>
              <li>Ambos os menus agora mostram o ícone de lista com bullets sem distorção</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}