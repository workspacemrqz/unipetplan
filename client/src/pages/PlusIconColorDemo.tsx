import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { SvgIcon } from "@/components/ui/SvgIcon";

export default function PlusIconColorDemo() {
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
          <h1 className="text-3xl font-bold mb-6">Correção: Ícone "Novo Atendimento" com Cores Sincronizadas</h1>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8">
            <p className="text-sm text-green-700">
              <strong>✅ Correção Implementada!</strong>
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-green-700">
              <li>O ícone "+" do botão "Novo Atendimento" agora herda a cor do texto</li>
              <li>Quando o texto muda de cor, o ícone muda junto</li>
              <li>Funciona em todos os estados: inativo, hover e ativo</li>
            </ul>
          </div>

          {/* Demo Visual */}
          <div className="border rounded-lg p-6 bg-gray-50 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-primary">Menu Unidade - Botão "Novo Atendimento"</h2>
            
            <div className="space-y-4">
              {/* Estado Inativo */}
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">Estado Inativo (Gray-600)</p>
                <div className="flex items-center px-3 py-2.5 text-sm rounded-lg text-gray-600 bg-white border border-gray-200">
                  <SvgIcon 
                    name="Plus" 
                    className="h-5 w-5 mr-3 [filter:brightness(0)_saturate(100%)_invert(40%)_sepia(1%)_saturate(0%)_hue-rotate(0deg)_brightness(98%)_contrast(102%)]"
                  />
                  <span className="font-medium">Novo Atendimento</span>
                  <span className="ml-auto text-xs text-gray-400">Ícone e texto em gray-600</span>
                </div>
              </div>

              {/* Estado Hover */}
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">Estado Hover (Primary/Teal)</p>
                <div className="flex items-center px-3 py-2.5 text-sm rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <SvgIcon 
                    name="Plus" 
                    className="h-5 w-5 mr-3 [filter:brightness(0)_saturate(100%)_invert(44%)_sepia(59%)_saturate(506%)_hue-rotate(131deg)_brightness(97%)_contrast(94%)]"
                  />
                  <span className="font-medium">Novo Atendimento</span>
                  <span className="ml-auto text-xs text-primary/70">Ícone e texto em primary</span>
                </div>
              </div>

              {/* Estado Ativo */}
              <div>
                <p className="text-sm text-gray-500 mb-2 font-medium">Estado Ativo (Branco)</p>
                <div className="flex items-center px-3 py-2.5 text-sm rounded-lg bg-primary text-white shadow-md">
                  <SvgIcon 
                    name="Plus" 
                    className="h-5 w-5 mr-3 [filter:brightness(0)_saturate(100%)_invert(1)]"
                  />
                  <span className="font-medium">Novo Atendimento</span>
                  <span className="ml-auto text-xs text-white/80">Ícone e texto em branco</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparação Antes/Depois */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-semibold mb-3 text-red-900">❌ Antes (Problema)</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-white rounded"></div>
                  <span className="text-sm text-gray-700">Ícone sempre branco (invertido)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-gray-600 rounded"></div>
                  <span className="text-sm text-gray-700">Texto mudava de cor</span>
                </div>
                <p className="text-xs text-red-700 mt-2">Cores não sincronizadas</p>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold mb-3 text-green-900">✅ Agora (Corrigido)</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-gray-600 rounded"></div>
                  <span className="text-sm text-gray-700">Ícone acompanha o texto</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-gray-600 rounded"></div>
                  <span className="text-sm text-gray-700">Texto e ícone sincronizados</span>
                </div>
                <p className="text-xs text-green-700 mt-2">Cores sempre iguais</p>
              </div>
            </div>
          </div>

          {/* Teste Visual do Ícone */}
          <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-400">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Demonstração do Ícone Plus com Diferentes Filtros:</strong>
            </p>
            <div className="flex items-center justify-center space-x-6 mt-4">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-2">Gray-600</p>
                <div className="bg-white p-3 rounded border">
                  <img 
                    src="/Icons/Plus.svg" 
                    alt="Plus Gray"
                    className="h-10 w-10"
                    style={{ filter: "brightness(0) saturate(100%) invert(40%) sepia(1%) saturate(0%) hue-rotate(0deg) brightness(98%) contrast(102%)" }}
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-2">Primary (Teal)</p>
                <div className="bg-white p-3 rounded border">
                  <img 
                    src="/Icons/Plus.svg" 
                    alt="Plus Primary"
                    className="h-10 w-10"
                    style={{ filter: "brightness(0) saturate(100%) invert(44%) sepia(59%) saturate(506%) hue-rotate(131deg) brightness(97%) contrast(94%)" }}
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-2">Branco</p>
                <div className="bg-primary p-3 rounded border">
                  <img 
                    src="/Icons/Plus.svg" 
                    alt="Plus White"
                    className="h-10 w-10"
                    style={{ filter: "brightness(0) saturate(100%) invert(1)" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-400">
            <p className="text-sm text-green-700">
              <strong>Como verificar na rota real:</strong>
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-green-700">
              <li>Acesse <code className="bg-green-100 px-1 rounded">/unidade/[slug]/atendimentos</code></li>
              <li>Observe o botão "Novo Atendimento" no menu lateral</li>
              <li>Passe o mouse sobre o botão e veja o ícone mudar de cor junto com o texto</li>
              <li>Clique no botão para vê-lo ficar ativo - ícone e texto ficam brancos juntos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}