import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, MapPin, Stethoscope, Edit, Save, X, Camera, Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useAuth } from "@/contexts/AuthContext";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: string;
  sex: string;
  castrated: boolean;
  color?: string;
  weight?: string;
  microchip?: string;
  previousDiseases?: string;
  surgeries?: string;
  allergies?: string;
  currentMedications?: string;
  hereditaryConditions?: string;
  lastCheckup?: string;
  parasiteTreatments?: string;
  image?: string;
  imageUrl?: string;
  createdAt: string;
}

interface Client {
  id: string;
  full_name: string;
  email: string;
}

interface Guide {
  id: string;
  title: string;
  description: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CustomerPets() {
  const [, navigate] = useLocation();
  const { client, isLoading: authLoading, error: authError } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPet, setEditingPet] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Pet>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [showGuides, setShowGuides] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [guidesError, setGuidesError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !client && !authError) {
      navigate('/cliente/login');
    }
  }, [authLoading, client, authError, navigate]);

  // Load pets data when authenticated
  useEffect(() => {
    const loadPets = async () => {
      if (authLoading || !client) {
        return;
      }

      try {
        const petsResponse = await fetch('/api/clients/pets', {
          credentials: 'include'
        });

        if (petsResponse.ok) {
          const petsResult = await petsResponse.json();
          setPets(petsResult.pets || []);
        } else {
          setError('Erro ao carregar pets');
        }
      } catch (error) {
        console.error('Error loading pets:', error);
        setError('Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    loadPets();
  }, [authLoading, client]);

  const startEditing = (pet: Pet) => {
    setEditingPet(pet.id);
    setEditFormData({ ...pet });
  };

  const cancelEditing = () => {
    setEditingPet(null);
    setEditFormData({});
  };

  const updateFormField = (field: keyof Pet, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveChanges = async (petId: string) => {
    if (!editFormData) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/clients/pets/${petId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        const result = await response.json();
        setPets(prev => prev.map(pet => 
          pet.id === petId ? { ...pet, ...result.pet } : pet
        ));
        setEditingPet(null);
        setEditFormData({});
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao salvar alterações');
      }
    } catch (error) {
      console.error('Error saving pet changes:', error);
      setError('Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  const deletePet = async (petId: string, petName: string) => {
    const confirmed = window.confirm(`Tem certeza que deseja excluir o pet "${petName}"? Esta ação não pode ser desfeita.`);
    
    if (!confirmed) return;
    
    setIsDeleting(petId);
    try {
      const response = await fetch(`/api/clients/pets/${petId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setPets(prev => prev.filter(pet => pet.id !== petId));
        
        // If the deleted pet was being edited, cancel editing
        if (editingPet === petId) {
          cancelEditing();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao excluir pet');
      }
    } catch (error) {
      console.error('Error deleting pet:', error);
      setError('Erro ao excluir pet');
    } finally {
      setIsDeleting(null);
    }
  };

  const uploadImage = async (petId: string, file: File) => {
    setUploadingImage(petId);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = reader.result as string;
          
          const response = await fetch(`/api/clients/pets/${petId}/image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ image: base64String })
          });

          if (response.ok) {
            const result = await response.json();
            setPets(prev => prev.map(pet => 
              pet.id === petId ? { ...pet, ...result.pet } : pet
            ));
          } else {
            const errorData = await response.json();
            setError(errorData.error || 'Erro ao fazer upload da imagem');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          setError('Erro ao fazer upload da imagem');
        } finally {
          setUploadingImage(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setError('Erro ao processar arquivo');
      setUploadingImage(null);
    }
  };

  const handleImageUpload = (petId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione apenas arquivos de imagem');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Imagem muito grande. Máximo 5MB');
        return;
      }
      
      uploadImage(petId, file);
    }
  };

  const fetchPetGuides = async (petId: string) => {
    setLoadingGuides(true);
    setGuidesError(null);
    
    try {
      const response = await fetch(`/api/clients/pets/${petId}/guides`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setGuides(result.guides || []);
      } else {
        const errorData = await response.json();
        setGuidesError(errorData.error || 'Erro ao carregar atendimentos');
      }
    } catch (error) {
      console.error('Error fetching guides:', error);
      setGuidesError('Erro ao carregar atendimentos');
    } finally {
      setLoadingGuides(false);
    }
  };

  const openGuides = (petId: string) => {
    setShowGuides(petId);
    fetchPetGuides(petId);
  };

  const closeGuides = () => {
    setShowGuides(null);
    setGuides([]);
    setGuidesError(null);
  };

  const formatPetInfo = (label: string, value?: string | boolean | null): string => {
    if (value === null || value === undefined || value === '') {
      return `${label}: Não informado`;
    }
    if (typeof value === 'boolean') {
      return `${label}: ${value ? 'Sim' : 'Não'}`;
    }
    return `${label}: ${value}`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Não informado';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  const getSpeciesIcon = (species: string, className: string = "h-6 w-6") => {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" className={className}>
        <path d="M180-475q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm180-160q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm240 0q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Zm180 160q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM266-75q-45 0-75.5-34.5T160-191q0-52 35.5-91t70.5-77q29-31 50-67.5t50-68.5q22-26 51-43t63-17q34 0 63 16t51 42q28 32 49.5 69t50.5 69q35 38 70.5 77t35.5 91q0 47-30.5 81.5T694-75q-54 0-107-9t-107-9q-54 0-107 9t-107 9Z"/>
      </svg>
    );
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-16 flex items-center justify-center" style={{ background: 'var(--bg-cream-light)' }}>
          <div className="text-center">
            <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4" 
              style={{borderColor: 'var(--text-teal)', borderTopColor: 'transparent'}}></div>
            <p style={{ color: 'var(--text-dark-secondary)' }}>Carregando pets...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-16 flex items-center justify-center" style={{ background: 'var(--bg-cream-light)' }}>
          <div className="text-center">
            <p className="mb-4" style={{ color: 'var(--text-dark-primary)' }}>{error}</p>
            <button
              onClick={() => navigate('/cliente/painel')}
              className="px-6 py-2 rounded-lg"
              style={{ background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)' }}
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen pt-16" style={{ background: 'var(--bg-cream-light)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="mb-6">
              <button
                onClick={() => navigate('/cliente/painel')}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg mb-4"
                style={{ background: 'var(--bg-beige)', color: 'var(--text-dark-secondary)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-dark-primary)' }}>
                Meus Pets
              </h1>
              <p className="mb-4" style={{ color: 'var(--text-dark-secondary)' }}>
                {pets.length > 0 ? `${pets.length} ${pets.length === 1 ? 'pet cadastrado' : 'pets cadastrados'}` : 'Nenhum pet cadastrado ainda'}
              </p>
            </div>
          </motion.div>

          {/* Pets List */}
          {pets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-8 text-center"
            >
              <Heart className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-teal)' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-dark-primary)' }}>
                Nenhum pet cadastrado
              </h3>
              <p className="mb-6" style={{ color: 'var(--text-dark-secondary)' }}>
                Você ainda não possui pets cadastrados em sua conta.
              </p>
              <button
                onClick={() => navigate('/cliente/painel')}
                className="px-6 py-3 rounded-lg font-medium"
                style={{ background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)' }}
              >
                Voltar ao Dashboard
              </button>
            </motion.div>
          ) : (
            <div className="grid gap-6">
              {pets.map((pet, index) => (
                <motion.div
                  key={pet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg p-6"
                >
                  {/* Pet Header */}
                  <div className="flex items-center space-x-4 mb-6">
                    <div 
                      className="relative cursor-pointer" 
                      onClick={() => {
                        const fileInput = document.querySelector(`#file-input-${pet.id}`) as HTMLInputElement;
                        fileInput?.click();
                      }}
                    >
                      {pet.imageUrl ? (
                        <img 
                          src={pet.imageUrl} 
                          alt={pet.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                          style={{ background: 'var(--bg-cream-light)' }}>
                          {getSpeciesIcon(pet.species)}
                        </div>
                      )}
                      
                      {/* Image Upload Button */}
                      <div className="absolute -bottom-1 -right-1">
                        <label className="cursor-pointer">
                          <input
                            id={`file-input-${pet.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(pet.id, e)}
                            className="hidden"
                          />
                          <div className="w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center"
                            style={{ border: '2px solid var(--text-teal)' }}>
                            {uploadingImage === pet.id ? (
                              <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Camera className="w-3 h-3" style={{ color: 'var(--text-teal)' }} />
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold" style={{ color: 'var(--text-dark-primary)' }}>
                        {pet.name}
                      </h3>
                      <p className="text-lg" style={{ color: 'var(--text-teal)' }}>
                        {pet.species} {pet.breed ? `• ${pet.breed}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Pet Info Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {/* Basic Info */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center space-x-2" style={{ color: 'var(--text-dark-primary)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="var(--text-teal)"><path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
                        <span>Informações Básicas</span>
                      </h4>
                      <div className="space-y-2 text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                        {editingPet === pet.id ? (
                          <>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Raça</label>
                              <input
                                type="text"
                                value={editFormData.breed || 'Não informado'}
                                readOnly
                                className="w-full p-3 rounded-lg border text-sm cursor-not-allowed"
                                style={{ 
                                  borderColor: 'var(--border-gray)', 
                                  backgroundColor: 'var(--bg-cream-light)', 
                                  color: 'var(--text-dark-secondary)',
                                  opacity: 0.8
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Idade</label>
                              <input
                                type="text"
                                value={editFormData.age || ''}
                                onChange={(e) => updateFormField('age', e.target.value)}
                                placeholder="Não informado"
                                className="w-full p-3 rounded-lg border text-sm"
                                style={{ 
                                  borderColor: 'var(--border-gray)',
                                  backgroundColor: '#FFFFFF'
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Sexo</label>
                              <input
                                type="text"
                                value={editFormData.sex || 'Não informado'}
                                readOnly
                                className="w-full p-3 rounded-lg border text-sm cursor-not-allowed"
                                style={{ 
                                  borderColor: 'var(--border-gray)', 
                                  backgroundColor: 'var(--bg-cream-light)', 
                                  color: 'var(--text-dark-secondary)',
                                  opacity: 0.8
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Castrado</label>
                              <Select 
                                value={editFormData.castrated ? 'true' : 'false'} 
                                onValueChange={(value) => updateFormField('castrated', value === 'true')}
                              >
                                <SelectTrigger 
                                  className="w-full p-3 rounded-lg border text-sm [&>span]:text-left [&>span]:flex [&>span]:flex-col [&>span]:items-start"
                                  style={{
                                    borderColor: 'var(--border-gray)',
                                    background: 'white'
                                  }}
                                >
                                  <SelectValue placeholder="Selecionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="false">Não</SelectItem>
                                  <SelectItem value="true">Sim</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Cor</label>
                              <input
                                type="text"
                                value={editFormData.color || ''}
                                onChange={(e) => updateFormField('color', e.target.value)}
                                placeholder="Não informado"
                                className="w-full p-3 rounded-lg border text-sm"
                                style={{ 
                                  borderColor: 'var(--border-gray)',
                                  backgroundColor: '#FFFFFF'
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Peso (kg)</label>
                              <input
                                type="text"
                                value={editFormData.weight || ''}
                                onChange={(e) => updateFormField('weight', e.target.value)}
                                placeholder="Não informado"
                                className="w-full p-3 rounded-lg border text-sm"
                                style={{ 
                                  borderColor: 'var(--border-gray)',
                                  backgroundColor: '#FFFFFF'
                                }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <p>{formatPetInfo('Raça', pet.breed)}</p>
                            <p>{formatPetInfo('Idade', pet.age)}</p>
                            <p>{formatPetInfo('Sexo', pet.sex)}</p>
                            <p>{formatPetInfo('Castrado', pet.castrated)}</p>
                            <p>{formatPetInfo('Cor', pet.color)}</p>
                            <p>{formatPetInfo('Peso', pet.weight ? `${pet.weight} kg` : undefined)}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Identification */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center space-x-2" style={{ color: 'var(--text-dark-primary)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="var(--text-teal)"><path d="M481-781q106 0 200 45.5T838-604q7 9 4.5 16t-8.5 12q-6 5-14 4.5t-14-8.5q-55-78-141.5-119.5T481-741q-97 0-182 41.5T158-580q-6 9-14 10t-14-4q-7-5-8.5-12.5T126-602q62-85 155.5-132T481-781Zm0 94q135 0 232 90t97 223q0 50-35.5 83.5T688-257q-51 0-87.5-33.5T564-374q0-33-24.5-55.5T481-452q-34 0-58.5 22.5T398-374q0 97 57.5 162T604-121q9 3 12 10t1 15q-2 7-8 12t-15 3q-104-26-170-103.5T358-374q0-50 36-84t87-34q51 0 87 34t36 84q0 33 25 55.5t59 22.5q34 0 58-22.5t24-55.5q0-116-85-195t-203-79q-118 0-203 79t-85 194q0 24 4.5 60t21.5 84q3 9-.5 16T208-205q-8 3-15.5-.5T182-217q-15-39-21.5-77.5T154-374q0-133 96.5-223T481-687Zm0-192q64 0 125 15.5T724-819q9 5 10.5 12t-1.5 14q-3 7-10 11t-17-1q-53-27-109.5-41.5T481-839q-58 0-114 13.5T260-783q-8 5-16 2.5T232-791q-4-8-2-14.5t10-11.5q56-30 117-46t124-16Zm0 289q93 0 160 62.5T708-374q0 9-5.5 14.5T688-354q-8 0-14-5.5t-6-14.5q0-75-55.5-125.5T481-550q-76 0-130.5 50.5T296-374q0 81 28 137.5T406-123q6 6 6 14t-6 14q-6 6-14 6t-14-6q-59-62-90.5-126.5T256-374q0-91 66-153.5T481-590Zm-1 196q9 0 14.5 6t5.5 14q0 75 54 123t126 48q6 0 17-1t23-3q9-2 15.5 2.5T744-191q2 8-3 14t-13 8q-18 5-31.5 5.5t-16.5.5q-89 0-154.5-60T460-374q0-8 5.5-14t14.5-6Z"/></svg>
                        <span>Identificação</span>
                      </h4>
                      <div className="space-y-2 text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                        {editingPet === pet.id ? (
                          <>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Microchip</label>
                              <input
                                type="text"
                                value={editFormData.microchip || ''}
                                onChange={(e) => updateFormField('microchip', e.target.value)}
                                placeholder="Não informado"
                                className="w-full p-3 rounded-lg border text-sm"
                                style={{ 
                                  borderColor: 'var(--border-gray)',
                                  backgroundColor: '#FFFFFF'
                                }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <p>{formatPetInfo('Microchip', pet.microchip)}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Health Info */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center space-x-2" style={{ color: 'var(--text-dark-primary)' }}>
                        <Stethoscope className="w-4 h-4" style={{ color: 'var(--text-teal)' }} />
                        <span>Informações de Saúde</span>
                      </h4>
                      <div className="space-y-2 text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                        {editingPet === pet.id ? (
                          <>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Último Check-up</label>
                              <input
                                type="date"
                                value={editFormData.lastCheckup || ''}
                                onChange={(e) => updateFormField('lastCheckup', e.target.value)}
                                className="w-full p-3 rounded-lg border text-sm"
                                style={{ 
                                  borderColor: 'var(--border-gray)',
                                  backgroundColor: '#FFFFFF'
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Doenças Prévias</label>
                              <textarea
                                value={editFormData.previousDiseases || ''}
                                onChange={(e) => updateFormField('previousDiseases', e.target.value)}
                                placeholder="Não informado"
                                rows={3}
                                className="w-full p-3 rounded-lg border text-sm resize-none overflow-y-auto"
                                style={{ 
                                  borderColor: 'var(--border-gray)',
                                  backgroundColor: '#FFFFFF',
                                  height: '80px'
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Alergias</label>
                              <textarea
                                value={editFormData.allergies || ''}
                                onChange={(e) => updateFormField('allergies', e.target.value)}
                                placeholder="Não informado"
                                rows={3}
                                className="w-full p-3 rounded-lg border text-sm resize-none overflow-y-auto"
                                style={{ 
                                  borderColor: 'var(--border-gray)',
                                  backgroundColor: '#FFFFFF',
                                  height: '80px'
                                }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <p>{formatPetInfo('Último Check-up', pet.lastCheckup ? formatDate(pet.lastCheckup) : undefined)}</p>
                            <p>{formatPetInfo('Doenças Prévias', pet.previousDiseases)}</p>
                            <p>{formatPetInfo('Alergias', pet.allergies)}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Health Details */}
                  {(editingPet === pet.id || pet.surgeries || pet.currentMedications || pet.hereditaryConditions || pet.parasiteTreatments) && (
                    <div className="border-t pt-4" style={{ borderColor: 'var(--border-gray)' }}>
                      <h4 className="font-semibold mb-3" style={{ color: 'var(--text-dark-primary)' }}>
                        Informações Médicas Adicionais
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        {editingPet === pet.id ? (
                          <>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Cirurgias</label>
                              <textarea
                                value={editFormData.surgeries || ''}
                                onChange={(e) => updateFormField('surgeries', e.target.value)}
                                placeholder="Não informado"
                                rows={3}
                                className="w-full p-3 rounded-lg border text-sm resize-none overflow-y-auto"
                                style={{ 
                                  borderColor: 'var(--border-gray)',
                                  backgroundColor: '#FFFFFF',
                                  height: '80px'
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Medicações Atuais</label>
                              <textarea
                                value={editFormData.currentMedications || ''}
                                onChange={(e) => updateFormField('currentMedications', e.target.value)}
                                placeholder="Não informado"
                                rows={3}
                                className="w-full p-3 rounded-lg border text-sm resize-none overflow-y-auto"
                                style={{ 
                                  borderColor: 'var(--border-gray)',
                                  backgroundColor: '#FFFFFF',
                                  height: '80px'
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Condições Hereditárias</label>
                              <textarea
                                value={editFormData.hereditaryConditions || ''}
                                onChange={(e) => updateFormField('hereditaryConditions', e.target.value)}
                                placeholder="Não informado"
                                rows={3}
                                className="w-full p-3 rounded-lg border text-sm resize-none overflow-y-auto"
                                style={{ 
                                  borderColor: 'var(--border-gray)',
                                  backgroundColor: '#FFFFFF',
                                  height: '80px'
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-dark-primary)' }}>Tratamentos Parasitas</label>
                              <textarea
                                value={editFormData.parasiteTreatments || ''}
                                onChange={(e) => updateFormField('parasiteTreatments', e.target.value)}
                                placeholder="Não informado"
                                rows={3}
                                className="w-full p-3 rounded-lg border text-sm resize-none overflow-y-auto"
                                style={{ 
                                  borderColor: 'var(--border-gray)',
                                  backgroundColor: '#FFFFFF',
                                  height: '80px'
                                }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            {pet.surgeries && (
                              <div>
                                <p className="font-medium text-sm" style={{ color: 'var(--text-dark-primary)' }}>Cirurgias:</p>
                                <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>{pet.surgeries}</p>
                              </div>
                            )}
                            {pet.currentMedications && (
                              <div>
                                <p className="font-medium text-sm" style={{ color: 'var(--text-dark-primary)' }}>Medicações Atuais:</p>
                                <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>{pet.currentMedications}</p>
                              </div>
                            )}
                            {pet.hereditaryConditions && (
                              <div>
                                <p className="font-medium text-sm" style={{ color: 'var(--text-dark-primary)' }}>Condições Hereditárias:</p>
                                <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>{pet.hereditaryConditions}</p>
                              </div>
                            )}
                            {pet.parasiteTreatments && (
                              <div>
                                <p className="font-medium text-sm" style={{ color: 'var(--text-dark-primary)' }}>Tratamentos Parasitas:</p>
                                <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>{pet.parasiteTreatments}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 pt-4">
                    {editingPet === pet.id ? (
                      <>
                        {/* When editing: Only show Atualizar and Cancelar buttons */}
                        <button
                          onClick={() => saveChanges(pet.id)}
                          disabled={isSaving}
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors min-w-[110px]"
                          style={{ 
                            background: 'var(--btn-ver-planos-bg)', 
                            color: 'var(--btn-ver-planos-text)',
                            opacity: isSaving ? 0.6 : 1
                          }}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Atualizar</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors"
                          style={{ background: 'var(--bg-beige)', color: 'var(--text-dark-secondary)' }}
                        >
                          <X className="w-4 h-4" />
                          <span>Cancelar</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {/* When not editing: Show Editar, Atendimentos, and Apagar buttons */}
                        <button
                          onClick={() => startEditing(pet)}
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg"
                          style={{ background: 'var(--bg-beige)', color: 'var(--text-dark-secondary)' }}
                        >
                          <Edit className="w-4 h-4" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => openGuides(pet.id)}
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg"
                          style={{ background: 'var(--bg-beige)', color: 'var(--text-dark-secondary)' }}
                        >
                          <FileText className="w-4 h-4" />
                          <span>Atendimentos</span>
                        </button>
                      </>
                    )}
                  </div>

                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Guides Modal */}
      {showGuides && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-gray)' }}>
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6" style={{ color: 'var(--text-teal)' }} />
                <h3 className="text-xl font-semibold" style={{ color: 'var(--text-dark-primary)' }}>
                  Atendimentos do Pet
                </h3>
              </div>
              <button
                onClick={closeGuides}
                className="p-2 rounded-lg"
                style={{ color: 'var(--text-dark-secondary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {loadingGuides ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto mb-4" 
                      style={{borderColor: 'var(--text-teal)', borderTopColor: 'transparent'}}></div>
                    <p style={{ color: 'var(--text-dark-secondary)' }}>Carregando atendimentos...</p>
                  </div>
                </div>
              ) : guidesError ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ background: 'var(--bg-cream-light)' }}>
                      <X className="w-6 h-6" style={{ color: 'rgb(var(--destructive))' }} />
                    </div>
                    <p className="text-lg font-medium" style={{ color: 'var(--text-dark-primary)' }}>
                      Erro ao carregar atendimentos
                    </p>
                    <button
                      onClick={() => fetchPetGuides(showGuides)}
                      className="mt-4 px-4 py-2 rounded-lg"
                      style={{ background: 'var(--btn-ver-planos-bg)', color: 'var(--btn-ver-planos-text)' }}
                    >
                      Tentar Novamente
                    </button>
                  </div>
                </div>
              ) : guides.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ background: 'var(--bg-cream-light)' }}>
                      <FileText className="w-8 h-8" style={{ color: 'var(--text-teal)' }} />
                    </div>
                    <p className="text-lg font-medium" style={{ color: 'var(--text-dark-primary)' }}>
                      Não há atendimentos vinculadas ao pet
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {guides.map((guide) => (
                    <div key={guide.id} className="border rounded-lg p-4" style={{ borderColor: 'var(--border-gray)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-lg" style={{ color: 'var(--text-dark-primary)' }}>
                            {guide.title}
                          </h4>
                          <p className="text-sm" style={{ color: 'var(--text-dark-secondary)' }}>
                            Criada em: {new Date(guide.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ background: 'var(--bg-cream-light)', color: 'var(--text-teal)' }}>
                            Guia
                          </span>
                        </div>
                      </div>
                      
                      {guide.description && (
                        <p className="mb-3" style={{ color: 'var(--text-dark-secondary)' }}>
                          {guide.description}
                        </p>
                      )}
                      
                      {guide.content && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-dark-primary)' }}>
                            {guide.content}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
    </>
  );
}