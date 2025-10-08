import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PawPrint, Phone, MapPin, Calendar, CreditCard, QrCode, Shield, Heart, Camera, AlertCircle } from "lucide-react";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  sex: string;
  age?: string;
}

interface Client {
  id: string;
  fullName: string;
  phone: string;
  city?: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
}

interface NetworkUnit {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface DigitalCardProps {
  pet: Pet;
  client: Client;
  plan?: Plan;
  unit: NetworkUnit;
  cardNumber?: string;
  validUntil?: string;
  photoUrl?: string;
  className?: string;
}

export default function DigitalCard({
  pet,
  client,
  plan,
  unit,
  cardNumber = "000000000",
  validUntil,
  photoUrl,
  className = ""
}: DigitalCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const formatCardNumber = (number: string) => {
    return number.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
  };

  const formatValidUntil = () => {
    if (validUntil) {
      return new Date(validUntil).toLocaleDateString('pt-BR', {
        month: '2-digit',
        year: 'numeric'
      });
    }
    // Default to 1 year from now
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toLocaleDateString('pt-BR', {
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className={`group perspective-1000 w-full max-w-md mx-auto ${className}`}>
      <div 
        className={`relative w-full h-56 sm:h-64 transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={handleFlip}
      >
        {/* FRONT SIDE */}
        <Card className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 border-none shadow-xl">
          <div className="relative h-full p-4 sm:p-6 text-white overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4">
                <PawPrint className="h-32 w-32 text-white" />
              </div>
              <div className="absolute bottom-4 left-4">
                <Heart className="h-16 w-16 text-white" />
              </div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center space-x-2">
                <PawPrint className="h-6 w-6" />
                <span className="text-lg font-bold">UNIPET</span>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                Carteirinha Digital
              </Badge>
            </div>

            {/* Main Content */}
            <div className="flex space-x-4 relative z-10">
              {/* Pet Photo */}
              <div className="flex-shrink-0 relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-white/10 border-2 border-white/40 flex items-center justify-center overflow-hidden relative backdrop-blur-sm">
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt={pet.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="relative">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center mb-1">
                          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" className="h-5 w-5 sm:h-6 sm:w-6 text-white/80">
                            <path d="M180-475q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm180-160q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm240 0q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm180 160q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM266-75q-45 0-75.5-34.5T160-191q0-52 35.5-91t70.5-77q29-31 50-67.5t50-68.5q22-26 51-43t63-17q34 0 63 16t51 42q28 32 49.5 69t50.5 69q35 38 70.5 77t35.5 91q0 47-30.5 81.5T694-75q-54 0-107-9t-107-9q-54 0-107 9t-107 9Z"/>
                          </svg>
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center">
                          <Camera className="h-2.5 w-2.5 text-white" />
                        </div>
                      </div>
                      <span className="text-xs text-white/70 font-medium">Foto</span>
                    </div>
                  )}
                </div>
                {!photoUrl && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <AlertCircle className="h-3 w-3 text-yellow-800" />
                  </div>
                )}
              </div>

              {/* Pet Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold mb-1 truncate">{pet.name}</h3>
                <p className="text-sm sm:text-base text-blue-100 mb-1">
                  {pet.species} {pet.breed ? `• ${pet.breed}` : ''} {pet.sex ? `• ${pet.sex}` : ''}
                </p>
                {pet.age && (
                  <p className="text-xs sm:text-sm text-blue-100 mb-2">{pet.age}</p>
                )}
                <div className="text-xs sm:text-sm text-blue-100">
                  <p className="font-medium truncate">{client.fullName}</p>
                  <p className="truncate">{client.phone}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end relative z-10">
              <div>
                <p className="text-xs text-blue-100 mb-1">Carteirinha Nº</p>
                <p className="text-sm font-mono font-bold">{formatCardNumber(cardNumber)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-100 mb-1">Válida até</p>
                <p className="text-sm font-bold">{formatValidUntil()}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* BACK SIDE */}
        <Card className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 shadow-xl">
          <div className="h-full p-4 sm:p-6 text-gray-800">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="font-bold text-blue-600">UNIPET</span>
              </div>
              <Badge variant="neutral" className="text-xs">
                Plano de Saúde Pet
              </Badge>
            </div>

            {/* Plan Info */}
            {plan && (
              <div className="mb-4">
                <h4 className="font-bold text-sm mb-1">{plan.name}</h4>
                <p className="text-xs text-gray-600 line-clamp-2">{plan.description}</p>
              </div>
            )}

            {/* Coverage Summary */}
            <div className="mb-4">
              <h5 className="font-semibold text-xs mb-2 text-gray-700">Cobertura Inclui:</h5>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Consultas</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Exames</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Cirurgias</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Especialistas</span>
                </div>
              </div>
            </div>

            {/* Unit Info */}
            <div className="mb-4 p-2 bg-blue-50 rounded border border-blue-200">
              <h5 className="font-semibold text-xs mb-1 text-blue-800">Unidade Credenciada:</h5>
              <div className="text-xs text-blue-700">
                <p className="font-medium truncate">{unit.name}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{unit.address}</span>
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <Phone className="h-3 w-3" />
                  <span>{unit.phone}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex justify-between items-end">
                {/* QR Code Placeholder */}
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded border border-gray-400 flex items-center justify-center">
                    <QrCode className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="text-xs text-gray-500">
                    <p>Escaneie para</p>
                    <p>verificar</p>
                  </div>
                </div>

                {/* Card ID */}
                <div className="text-right text-xs text-gray-500">
                  <p>ID: {pet.id.slice(-8).toUpperCase()}</p>
                  <p className="font-mono">{formatCardNumber(cardNumber)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
    </div>
  );
}