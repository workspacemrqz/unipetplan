import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { cn } from "@/lib/utils";
// Define NetworkUnit type based on the API response
interface NetworkUnit {
  id: string;
  name: string;
  address: string;
  cidade: string;
  phone: string;
  services: string[];
  imageUrl: string;
  isActive: boolean;
  createdAt: Date;
  whatsapp?: string;
  googleMapsUrl?: string;
  imageData?: string;
  urlSlug?: string;
  login?: string;
  senhaHash?: string;
}
import React, { useState, useMemo, useEffect } from "react";
import { useNetworkPageData } from "@/hooks/use-parallel-data";
import { AnimatedSection } from "@/components/ui/animated-section";
import { AnimatedList } from "@/components/ui/animated-list";
import { formatBrazilianPhoneForDisplay } from "@/hooks/use-site-settings";
// ByteaImageDisplay removed - now using Supabase Storage images

// Estilos e scripts removidos para simplificar o build


export default function Network() {
  // Usar hook otimizado para carregamento paralelo de unidades da rede e configurações
  const { data, isLoading } = useNetworkPageData();
  const networkUnits = data?.networkUnits || [];

  // Filter states
  const [searchText, setSearchText] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedService, setSelectedService] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const unitsPerPage = 9;

  // Get unique cities and services for filter options
  const uniqueCities = useMemo(() => {
    if (!networkUnits) return [] as string[];
    const cities = networkUnits.map((unit: NetworkUnit) => unit.cidade);
    return Array.from(new Set(cities)).sort();
  }, [networkUnits]);

  const uniqueServices = useMemo(() => {
    if (!networkUnits) return [] as string[];
    const allServices = networkUnits.flatMap((unit: NetworkUnit) => unit.services);
    return Array.from(new Set(allServices)).sort();
  }, [networkUnits]);

  // Filter units based on selected criteria
  const filteredUnits = useMemo(() => {
    if (!networkUnits) return [];

    return networkUnits.filter((unit: NetworkUnit) => {
      // Text search (name or address)
      const matchesSearch = searchText === "" || 
        unit.name.toLowerCase().includes(searchText.toLowerCase()) ||
        unit.address.toLowerCase().includes(searchText.toLowerCase());

      // City filter - using cidade column directly
      const matchesCity = selectedCity === "all" || 
        unit.cidade.toLowerCase() === selectedCity.toLowerCase();

      // Service filter
      const matchesService = selectedService === "all" ||
        unit.services.some((service: string) => service.toLowerCase().includes(selectedService.toLowerCase()));

      return matchesSearch && matchesCity && matchesService;
    });
  }, [networkUnits, searchText, selectedCity, selectedService]);

  const clearFilters = () => {
    setSearchText("");
    setSelectedCity("all");
    setSelectedService("all");
    setCurrentPage(1); // Reset to first page when clearing filters
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredUnits.length / unitsPerPage);
  const startIndex = (currentPage - 1) * unitsPerPage;
  const endIndex = startIndex + unitsPerPage;
  const currentUnits = filteredUnits.slice(startIndex, endIndex);

  // Effect to reset pagination when filtered results change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredUnits.length, totalPages, currentPage]);

  // Generate pagination buttons
  const generatePaginationButtons = () => {
    const buttons = [];

    for (let page = 1; page <= totalPages; page++) {
      const showPage = page === 1 || page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1);

      if (!showPage) {
        // Show ellipsis for gaps
        if (page === currentPage - 2 || page === currentPage + 2) {
          buttons.push(
            <span key={`ellipsis-${page}`} className="px-2 text-[var(--text-dark-secondary)]">
              ...
            </span>
          );
        }
        continue;
      }

      buttons.push(
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="sm"
          onClick={() => setCurrentPage(page)}
          className={currentPage === page 
            ? "bg-[var(--bg-teal)] text-[var(--text-light)] rounded-full w-9 h-9 p-0" 
            : "border-none bg-transparent text-[var(--text-teal)] rounded-full w-9 h-9 p-0"
          }
        >
          {page}
        </Button>
      );
    }

    return buttons;
  };

  // Skeleton loader for network units
  const NetworkUnitSkeleton = () => (
    <Card className="shadow-lg rounded-xl border bg-[var(--bg-cream-lighter)] overflow-hidden flex flex-col h-full" style={{borderColor: '#dbdbdb'}}>
      <Skeleton className="w-full aspect-square rounded-t-xl" />
      <CardContent className="px-6 pt-6 pb-0 flex flex-col flex-1">
        <Skeleton className="h-6 w-3/4 mb-3" />
        <div className="space-y-3 mb-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex gap-3 mt-auto">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <main className="page-section bg-[var(--bg-cream-light)] min-h-screen">
      <div className="section-container">
        <div className="page-header">
          <AnimatedSection animation="slideUp" delay={0}>
            <h1 className="page-title text-[var(--text-teal)]">
              Principais Unidades
            </h1>
          </AnimatedSection>
        </div>

        {/* Filter Section */}
            <AnimatedSection animation="scale" delay={50}>
              <div className="max-w-4xl mx-auto bg-[var(--bg-cream-lighter)] rounded-xl shadow-lg pt-10 pb-6 px-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {/* Search Input */}
                  <div className="network-search-field relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-dark-secondary)]" />
                    <Input
                      placeholder="Buscar..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="w-full pl-10 p-3 rounded-lg border text-sm"
                      style={{
                        borderColor: 'var(--border-gray)',
                        backgroundColor: '#FFFFFF',
                        paddingLeft: '2.5rem'
                      }}
                      data-testid="input-search-units"
                    />
                  </div>

                  {/* City Filter */}
                  <div className="network-filter-field">
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger 
                        className="w-full p-3 rounded-lg border text-sm [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                        style={{
                          borderColor: 'var(--border-gray)',
                          background: 'white'
                        }}
                        data-testid="select-city"
                      >
                        <SelectValue placeholder="Selecionar cidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as cidades</SelectItem>
                        {uniqueCities.length > 0 && <SelectSeparator />}
                        {(uniqueCities as string[]).map((city, index) => (
                          <React.Fragment key={`city-${index}`}>
                            <SelectItem value={city}>{city}</SelectItem>
                            {index < uniqueCities.length - 1 && <SelectSeparator />}
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Service Filter */}
                  <div className="network-filter-field">
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger 
                        className="w-full p-3 rounded-lg border text-sm [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                        style={{
                          borderColor: 'var(--border-gray)',
                          background: 'white'
                        }}
                        data-testid="select-service"
                      >
                        <SelectValue placeholder="Selecionar serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os serviços</SelectItem>
                        {uniqueServices.length > 0 && <SelectSeparator />}
                        {(uniqueServices as string[]).map((service, index) => (
                          <React.Fragment key={`service-${index}`}>
                            <SelectItem value={service}>{service}</SelectItem>
                            {index < uniqueServices.length - 1 && <SelectSeparator />}
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clear Filters and Results Count */}
                <div className="flex justify-between items-center">
                  <p className="text-sm text-[var(--text-dark-secondary)]">
                    {isLoading ? "Carregando..." : `${filteredUnits.length} unidade${filteredUnits.length !== 1 ? 's' : ''} encontrada${filteredUnits.length !== 1 ? 's' : ''}`}
                  </p>
                  {(searchText || selectedCity !== "all" || selectedService !== "all") && (
                    <Button
                      size="sm"
                      onClick={clearFilters}
                      className="text-[var(--btn-ver-planos-text)] border-none flex items-center justify-center"
                      style={{
                        background: 'var(--btn-ver-planos-bg)'
                      }}
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </div>
            </AnimatedSection>

        {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <NetworkUnitSkeleton key={i} />
              ))}
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--text-dark-primary)] text-lg mb-4">Nenhuma unidade encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            <>
              <AnimatedList animation="slideUp" delay={100} staggerDelay={30}>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {currentUnits.map((unit: NetworkUnit) => (
                    <Card key={unit.id} className="shadow-lg rounded-xl border bg-[var(--bg-cream-lighter)] overflow-hidden flex flex-col h-full" style={{borderColor: '#dbdbdb'}}>
                      <div className="relative">
                        <img 
                          src={unit.imageUrl || '/placeholder-veterinary.jpg'}
                          alt={unit.name}
                          className="w-full aspect-square object-cover rounded-t-xl"
                          loading="lazy"
                          onError={(e) => {
                            console.warn(`Network unit image error for ${unit.name}`);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>

                      <CardContent className="px-6 pt-6 pb-0 flex flex-col flex-1">
                        <h3 className="text-xl font-bold text-[var(--text-teal)] leading-tight mb-3">
                          {unit.name}
                        </h3>
                        <div className="space-y-3 mb-6">
                          <div className="flex items-start space-x-3">
                            <img 
                              src="/Icons/Localização.svg" 
                              alt="Localização"
                              className="h-4 w-4 mt-1 flex-shrink-0"
                              style={{ filter: 'brightness(0) saturate(100%) invert(59%) sepia(38%) saturate(1280%) hue-rotate(131deg) brightness(93%) contrast(90%)' }}
                            />
                            <span className="text-[var(--text-dark-primary)] text-sm">{unit.address}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <img 
                              src="/Icons/Emergencia.svg" 
                              alt="Emergência"
                              className="h-4 w-4 flex-shrink-0"
                              style={{ filter: 'brightness(0) saturate(100%) invert(59%) sepia(38%) saturate(1280%) hue-rotate(131deg) brightness(93%) contrast(90%)' }}
                            />
                            <span className="text-[var(--text-dark-primary)] text-sm font-medium">{formatBrazilianPhoneForDisplay(unit.phone)}</span>
                          </div>
                        </div>


                        <div className="flex gap-3 mt-auto">
                          <Button 
                            className={cn(
                              unit.googleMapsUrl ? "flex-1" : "w-full",
                              "transform-gpu transition-all duration-300 ease-out",
                              "hover:-translate-y-1 hover:shadow-lg"
                            )}
                            style={{
                              background: 'var(--btn-ver-planos-bg)',
                              color: 'var(--text-light)'
                            }}
                            onClick={() => {
                              if (unit.whatsapp) {
                                window.open(`https://wa.me/${unit.whatsapp}`, '_blank');
                              }
                            }}
                            disabled={!unit.whatsapp}
                            data-testid={`button-contact-unit-${unit.id}`}
                          >
                            <FaWhatsapp className="h-4 w-4 mr-2" style={{ color: 'var(--text-light)' }} />
                            Entrar em Contato
                          </Button>
                          {unit.googleMapsUrl && (
                            <Button 
                              className={cn(
                                "border",
                                "transform-gpu transition-all duration-300 ease-out",
                                "hover:-translate-y-1 hover:shadow-lg"
                              )}
                              style={{ 
                                background: 'var(--btn-solicitar-cotacao-bg)',
                                borderColor: 'var(--bg-teal-light)',
                                borderWidth: '1px'
                              }}
                              onClick={() => {
                                window.open(unit.googleMapsUrl, '_blank');
                              }}
                              data-testid={`button-location-unit-${unit.id}`}
                            >
                              <img 
                                src="/Icons/Localização.svg" 
                                alt="Localização"
                                className="h-4 w-4"
                                style={{ filter: 'brightness(0) saturate(100%) invert(59%) sepia(38%) saturate(1280%) hue-rotate(131deg) brightness(93%) contrast(90%)' }}
                              />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AnimatedList>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-12 flex flex-col items-center space-y-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="border-none bg-transparent text-[var(--text-teal)]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>

                    <div className="flex items-center space-x-1">
                      {generatePaginationButtons()}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="border-none bg-transparent text-[var(--text-teal)]"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
      </div>
    </main>
  );
}