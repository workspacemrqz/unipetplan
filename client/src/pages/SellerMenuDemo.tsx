import { Link } from "wouter";
import SellerSidebar from "@/components/seller/SellerSidebar";
import { ArrowLeft } from "lucide-react";

export default function SellerMenuDemo() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 h-full shadow-lg">
        <SellerSidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao início
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Demonstração do Menu do Vendedor</h1>
          <p className="text-gray-600 mb-4">
            Esta é uma página de demonstração para visualizar as alterações no menu lateral do vendedor.
          </p>
          
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <p className="text-sm text-blue-700">
              <strong>Alterações implementadas:</strong>
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-blue-700">
              <li>Ícones agora herdam a cor do texto do botão</li>
              <li>Quando o botão está ativo (verde): ícone fica branco como o texto</li>
              <li>Quando o botão está inativo: ícone fica cinza como o texto</li>
              <li>No hover: ícone muda para cinza escuro junto com o texto</li>
            </ul>
          </div>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <p className="text-sm text-green-700">
              <strong>Como testar:</strong>
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-green-700">
              <li>Clique nos botões do menu para vê-los ficarem ativos</li>
              <li>Passe o mouse sobre os botões inativos para ver o efeito hover</li>
              <li>Observe que os ícones sempre acompanham a cor do texto</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}