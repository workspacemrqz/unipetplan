import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { IStorage } from './storage.js';

interface UnitRequest extends Request {
  unit?: {
    unitId: string;
    slug: string;
    veterinarianId?: string;
    type?: 'unit' | 'veterinarian';
  };
}

export function setupUnitRoutes(app: any, storage: IStorage) {
  
  // Get unit info by slug (public)
  app.get("/api/network-units/:slug/info", async (req: Request, res: Response) => {
    try {
      const unit = await storage.getNetworkUnitBySlug(req.params.slug);
      if (!unit) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }
      res.json({ id: unit.id, name: unit.name });
    } catch (error) {
      console.error("❌ Error fetching unit info:", error);
      res.status(500).json({ error: "Erro ao buscar informações da unidade" });
    }
  });
  
  // Unit login
  app.post("/api/unit-auth/login", async (req: Request, res: Response) => {
    try {
      const { slug, login, password } = req.body;
      
      if (!slug || !login || !password) {
        return res.status(400).json({ error: "Dados incompletos" });
      }
      
      const unit = await storage.getNetworkUnitBySlug(slug);
      if (!unit) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }
      
      // Check credentials
      if (unit.login !== login) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, unit.senhaHash || '');
      
      if (!isValidPassword) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      
      // ✅ SECURITY FIX: Enforce SESSION_SECRET without fallback
      if (!process.env.SESSION_SECRET) {
        console.error('❌ [SECURITY] SESSION_SECRET not configured for JWT');
        return res.status(500).json({ error: 'Configuração de segurança ausente' });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { unitId: unit.id, slug: unit.urlSlug },
        process.env.SESSION_SECRET,
        { expiresIn: '8h' }
      );
      
      console.log(`✅ [UNIT-AUTH] Unit logged in: ${unit.name}`);
      res.json({ token, unitName: unit.name });
    } catch (error) {
      console.error("❌ [UNIT-AUTH] Login error:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });
  
  // Middleware to verify unit authentication (accepts both unit and veterinarian tokens)
  const requireUnitAuth = async (req: UnitRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Token não fornecido" });
      }
      
      const token = authHeader.substring(7);
      
      // ✅ SECURITY FIX: Enforce SESSION_SECRET without fallback
      if (!process.env.SESSION_SECRET) {
        console.error('❌ [SECURITY] SESSION_SECRET not configured for JWT verification');
        return res.status(500).json({ error: 'Configuração de segurança ausente' });
      }
      
      try {
        const decoded = jwt.verify(token, process.env.SESSION_SECRET) as any;
        
        // Accept both unit and veterinarian tokens
        if (decoded.type === 'veterinarian') {
          // Veterinarian token - verify current permissions and status
          const veterinarian = await storage.getVeterinarianById(decoded.veterinarianId);
          
          if (!veterinarian) {
            return res.status(401).json({ error: "Veterinário não encontrado" });
          }
          
          // ✅ SECURITY: Verify veterinarian is active
          if (!veterinarian.isActive) {
            return res.status(403).json({ error: "Veterinário inativo" });
          }
          
          // ✅ SECURITY: Verify veterinarian has access to atendimentos
          if (!veterinarian.canAccessAtendimentos) {
            return res.status(403).json({ error: "Acesso não autorizado" });
          }
          
          // Set request context with veterinarian info
          req.unit = {
            unitId: decoded.unitId,
            slug: decoded.slug,
            veterinarianId: decoded.veterinarianId,
            type: 'veterinarian'
          };
        } else {
          // Unit token (default)
          req.unit = {
            unitId: decoded.unitId,
            slug: decoded.slug,
            type: 'unit'
          };
        }
        
        next();
      } catch (err) {
        return res.status(401).json({ error: "Token inválido" });
      }
    } catch (error) {
      console.error("❌ [UNIT-AUTH] Auth middleware error:", error);
      res.status(500).json({ error: "Erro de autenticação" });
    }
  };
  
  // Get unit atendimentos (authenticated) - supports both /api/unit and /api/units paths
  app.get(["/api/unit/:slug/atendimentos", "/api/units/:slug/atendimentos"], requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Get query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Get atendimentos for this unit
      const result = await storage.getAtendimentosWithNetworkUnits({
        networkUnitId: unitId,
        status: status !== 'all' ? status : undefined
      });
      
      let allAtendimentos = result?.atendimentos || [];
      
      // Adicionar procedimentos para cada atendimento
      allAtendimentos = await Promise.all(
        allAtendimentos.map(async (atendimento: any) => {
          const procedures = await storage.getAtendimentoProcedures(atendimento.id);
          return {
            ...atendimento,
            procedures: procedures
          };
        })
      );
      
      // Apply date filter if present
      if (startDate || endDate) {
        const startDateTime = startDate ? new Date(startDate) : null;
        const endDateTime = endDate ? (() => {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return end;
        })() : null;

        allAtendimentos = allAtendimentos.filter((atendimento: any) => {
          if (!atendimento.createdAt) return false;
          const createdAt = new Date(atendimento.createdAt);
          if (startDateTime && createdAt < startDateTime) return false;
          if (endDateTime && createdAt > endDateTime) return false;
          return true;
        });
      }
      
      // Sort by createdAt descending (newest first)
      allAtendimentos.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      // Calculate pagination
      const filteredTotal = allAtendimentos.length;
      const totalPages = Math.ceil(filteredTotal / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedAtendimentos = allAtendimentos.slice(startIndex, endIndex);
      
      res.json({
        data: paginatedAtendimentos,
        total: filteredTotal,
        totalPages,
        page
      });
    } catch (error) {
      console.error("❌ [UNIT] Error fetching atendimentos:", error);
      res.status(500).json({ error: "Erro ao buscar atendimentos" });
    }
  });
  
  // Create new atendimento (authenticated)
  app.post(["/api/unit/:slug/atendimentos", "/api/units/:slug/atendimentos"], requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      const { procedures, ...atendimentoData } = req.body;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Processar múltiplos procedimentos
      const processedData = {
        ...atendimentoData,
        networkUnitId: unitId,
        createdByUnitId: unitId,
        procedure: procedures && procedures.length > 0 
          ? procedures.map((p: any) => p.name).join(", ")
          : atendimentoData.procedure
      };
      
      // Add unit ID to track which unit created this atendimento
      const newAtendimento = await storage.createAtendimento(processedData);
      
      // Salvar múltiplos procedimentos na tabela de relacionamento
      if (procedures && procedures.length > 0) {
        await storage.createAtendimentoProcedures(newAtendimento.id, procedures);
        console.log(`✅ [UNIT] Saved ${procedures.length} procedures for atendimento ${newAtendimento.id}`);
      }
      
      // Automatically register procedure usage when atendimento is created
      if (atendimentoData.petId && atendimentoData.procedureId) {
        try {
          const year = new Date().getFullYear();
          
          // Get pet's plan to check procedure limits
          const pet = await storage.getPet(atendimentoData.petId);
          if (pet && pet.planId) {
            const plan = await storage.getPlan(pet.planId);
            if (plan) {
              // Find procedure in plan to get limit - fetch from database
              const planProcedures = await storage.getPlanProceduresWithDetails(pet.planId);
              const procedureInPlan = planProcedures.find((p: any) => p.procedureId === atendimentoData.procedureId);
              
              if (procedureInPlan && procedureInPlan.annualLimit) {
                // Get current usage
                const usageRecords = await storage.getProcedureUsageByPet(atendimentoData.petId, year);
                const currentUsage = usageRecords.find((u: any) => u.procedureId === atendimentoData.procedureId && u.planId === pet.planId);
                const used = currentUsage?.usageCount || 0;
                const remaining = procedureInPlan.annualLimit - used;
                
                // Only register if there's remaining limit
                if (remaining > 0) {
                  await storage.incrementProcedureUsage(atendimentoData.petId, atendimentoData.procedureId, pet.planId);
                  console.log(`✅ [UNIT] Procedure usage automatically registered for pet ${atendimentoData.petId}, procedure ${atendimentoData.procedureId}`);
                } else {
                  console.log(`⚠️ [UNIT] Procedure limit reached for pet ${atendimentoData.petId}, procedure ${atendimentoData.procedureId}`);
                }
              }
            }
          }
        } catch (error) {
          // Log error but don't fail the atendimento creation
          console.error("❌ [UNIT] Error registering procedure usage:", error);
        }
      }
      
      console.log(`✅ [UNIT] Atendimento created by unit ${unitId}:`, newAtendimento.id);
      res.status(201).json(newAtendimento);
    } catch (error) {
      console.error("❌ [UNIT] Error creating atendimento:", error);
      res.status(500).json({ error: "Erro ao criar atendimento" });
    }
  });
  
  // Get financial report (authenticated)
  app.get(["/api/unit/:slug/relatorio-financeiro", "/api/units/:slug/relatorio-financeiro"], requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Get atendimentos for this unit with network unit info
      const result = await storage.getAtendimentosWithNetworkUnits({
        networkUnitId: unitId
      });
      
      let allAtendimentos = result?.atendimentos || [];
      
      // Adicionar procedimentos para cada atendimento
      allAtendimentos = await Promise.all(
        allAtendimentos.map(async (atendimento: any) => {
          const procedures = await storage.getAtendimentoProcedures(atendimento.id);
          return {
            ...atendimento,
            procedures: procedures
          };
        })
      );
      
      // Create financial report entries - one entry per procedure
      const financialEntries: any[] = [];
      
      for (const atendimento of allAtendimentos) {
        if (atendimento.procedures && atendimento.procedures.length > 0) {
          // Multiple procedures
          atendimento.procedures.forEach((proc: any) => {
            financialEntries.push({
              id: `${atendimento.id}-${proc.id || proc.procedureName}`,
              atendimentoId: atendimento.id,
              date: atendimento.createdAt,
              clientName: atendimento.clientName || 'Não informado',
              petName: atendimento.petName || '',
              procedure: proc.procedureName || proc.name || 'Não informado',
              coparticipacao: proc.coparticipacao || '0',
              value: proc.value || '0'
            });
          });
        } else {
          // Legacy single procedure
          financialEntries.push({
            id: atendimento.id,
            atendimentoId: atendimento.id,
            date: atendimento.createdAt,
            clientName: atendimento.clientName || 'Não informado',
            petName: atendimento.petName || '',
            procedure: atendimento.procedure || 'Não informado',
            coparticipacao: atendimento.coparticipacao || '0',
            value: atendimento.value || '0'
          });
        }
      }
      
      // Sort by date descending (most recent first)
      financialEntries.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      
      res.json(financialEntries);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching financial report:", error);
      res.status(500).json({ error: "Erro ao buscar relatório financeiro" });
    }
  });
  
  // Update atendimento status (authenticated)
  app.put(["/api/unit/:slug/atendimentos/:id", "/api/units/:slug/atendimentos/:id"], requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      const atendimentoId = req.params.id;
      const { status } = req.body;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Verify that the atendimento was created by this unit
      const atendimento = await storage.getAtendimento(atendimentoId);
      if (!atendimento) {
        return res.status(404).json({ error: "Atendimento não encontrado" });
      }
      
      if (atendimento.createdByUnitId !== unitId) {
        return res.status(403).json({ error: "Você não tem permissão para editar este atendimento" });
      }
      
      // Update the atendimento status
      const updatedAtendimento = await storage.updateAtendimento(atendimentoId, { status });
      
      console.log(`✅ [UNIT] Atendimento ${atendimentoId} status updated by unit ${unitId} to ${status}`);
      res.json(updatedAtendimento);
    } catch (error) {
      console.error("❌ [UNIT] Error updating atendimento:", error);
      res.status(500).json({ error: "Erro ao atualizar atendimento" });
    }
  });
  
  // Get unit clients (authenticated)
  app.get("/api/unit/:slug/clients", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Get all clients
      const allClients = await storage.getAllClients();
      
      // Filter only clients created by this unit
      const unitClients = allClients.filter((client: any) => client.createdByUnitId === unitId);
      
      // Get all pets
      const allPets = await storage.getAllPets();
      
      // Filter only pets created by this unit
      const unitPets = allPets.filter((pet: any) => pet.createdByUnitId === unitId);
      
      // Map clients with their pets
      const clientsWithPets = unitClients.map((client: any) => {
        const clientPets = unitPets.filter((pet: any) => pet.clientId === client.id);
        return {
          ...client,
          name: client.fullName, // Add name field for compatibility
          createdAt: client.createdAt || new Date().toISOString(),
          pets: clientPets
        };
      });
      
      res.json(clientsWithPets);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching clients:", error);
      res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  });
  
  // Get unit procedures (authenticated)
  app.get("/api/unit/:slug/procedures", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      // Get all active procedures from database
      const allProcedures = await storage.getAllProcedures();
      
      // Filter only active procedures and map to expected format
      const activeProcedures = allProcedures
        .filter((proc: any) => proc.isActive)
        .map((proc: any) => ({
          id: proc.id,
          name: proc.name,
          description: proc.description,
          price: parseFloat(proc.price || '0'),
          category: proc.category || 'Atendimento',
          isActive: proc.isActive
        }));
      
      res.json(activeProcedures);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching procedures:", error);
      res.status(500).json({ error: "Erro ao buscar procedimentos" });
    }
  });

  // Get unit procedures with plan details (authenticated)
  app.get("/api/unit/:slug/procedures-with-plans", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      // Get all active procedures from database
      const allProcedures = await storage.getAllProcedures();
      
      // Get all plans
      const allPlans = await storage.getPlans();
      const plansMap = new Map(allPlans.map((plan: any) => [plan.id, plan]));
      
      // Get all plan procedures (associations)
      const allPlanProcedures = await storage.getAllPlanProcedures();
      
      // Group plan procedures by procedure id
      const planProceduresByProcedureId = allPlanProcedures.reduce((acc: any, pp: any) => {
        if (!acc[pp.procedureId]) {
          acc[pp.procedureId] = [];
        }
        const plan = plansMap.get(pp.planId);
        if (plan) {
          acc[pp.procedureId].push({
            planId: pp.planId,
            planName: plan.name,
            price: pp.price || 0, // Valor integral
            payValue: pp.payValue || 0, // Valor a pagar
            coparticipacao: pp.coparticipacao || 0,
            carencia: pp.carencia || '',
            limitesAnuais: pp.limitesAnuais || '',
            isIncluded: pp.isIncluded
          });
        }
        return acc;
      }, {});
      
      // Filter only active procedures and map to expected format with plan details
      const proceduresWithPlans = allProcedures
        .filter((proc: any) => proc.isActive)
        .map((proc: any) => ({
          id: proc.id,
          name: proc.name,
          description: proc.description,
          category: proc.category || 'Atendimento',
          isActive: proc.isActive,
          plans: planProceduresByProcedureId[proc.id] || []
        }));
      
      res.json(proceduresWithPlans);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching procedures with plans:", error);
      res.status(500).json({ error: "Erro ao buscar procedimentos com planos" });
    }
  });

  // Create client (authenticated)
  app.post("/api/unit/:slug/clients", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const clientData = req.body;
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Map snake_case to camelCase for database and add unitId
      const dbClientData = {
        fullName: clientData.full_name || clientData.fullName,
        email: clientData.email,
        phone: clientData.phone,
        cpf: clientData.cpf,
        cep: clientData.cep,
        address: clientData.address,
        number: clientData.number,
        complement: clientData.complement,
        district: clientData.district,
        state: clientData.state,
        city: clientData.city,
        createdByUnitId: unitId
      };
      
      const newClient = await storage.createClient(dbClientData);
      console.log(`✅ [UNIT] Client created by unit ${unitId}:`, newClient.id);
      res.status(201).json(newClient);
    } catch (error) {
      console.error("❌ [UNIT] Error creating client:", error);
      res.status(500).json({ error: "Erro ao criar cliente" });
    }
  });

  // Update client (authenticated)
  app.put("/api/unit/:slug/clients/:id", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const clientData = req.body;
      const clientId = req.params.id;
      
      // Map snake_case to camelCase for database
      const dbClientData: any = {};
      if (clientData.full_name !== undefined) dbClientData.fullName = clientData.full_name;
      if (clientData.fullName !== undefined) dbClientData.fullName = clientData.fullName;
      if (clientData.email !== undefined) dbClientData.email = clientData.email;
      if (clientData.phone !== undefined) dbClientData.phone = clientData.phone;
      if (clientData.cpf !== undefined) dbClientData.cpf = clientData.cpf;
      if (clientData.cep !== undefined) dbClientData.cep = clientData.cep;
      if (clientData.address !== undefined) dbClientData.address = clientData.address;
      if (clientData.number !== undefined) dbClientData.number = clientData.number;
      if (clientData.complement !== undefined) dbClientData.complement = clientData.complement;
      if (clientData.district !== undefined) dbClientData.district = clientData.district;
      if (clientData.state !== undefined) dbClientData.state = clientData.state;
      if (clientData.city !== undefined) dbClientData.city = clientData.city;
      
      const updatedClient = await storage.updateClient(clientId, dbClientData);
      
      if (!updatedClient) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      console.log(`✅ [UNIT] Client updated:`, clientId);
      res.json(updatedClient);
    } catch (error) {
      console.error("❌ [UNIT] Error updating client:", error);
      res.status(500).json({ error: "Erro ao atualizar cliente" });
    }
  });

  // Create pet (authenticated)
  app.post("/api/unit/:slug/pets", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const petData = req.body;
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Process pet data
      const processedPetData = {
        ...petData,
        weight: petData.weight && petData.weight !== "" ? petData.weight : null,
        birthDate: petData.birthDate || null,
        lastCheckup: petData.lastCheckup || null,
        vaccineData: petData.vaccineData || [],
        planId: petData.planId && petData.planId !== "" ? petData.planId : null,
        createdByUnitId: unitId
      };
      
      const newPet = await storage.createPet(processedPetData);
      console.log(`✅ [UNIT] Pet created by unit ${unitId}:`, newPet.id);
      res.status(201).json(newPet);
    } catch (error) {
      console.error("❌ [UNIT] Error creating pet:", error);
      res.status(500).json({ error: "Erro ao criar pet" });
    }
  });

  // Get client by ID (authenticated)
  app.get("/api/unit/:slug/clients/:id", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const client = await storage.getClientById(req.params.id);
      
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      
      // Remove password if exists
      const { password: _, ...clientWithoutPassword } = client as any;
      res.json(clientWithoutPassword);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching client:", error);
      res.status(500).json({ error: "Erro ao buscar cliente" });
    }
  });

  // Get client by CPF (authenticated) - supports both /api/unit and /api/units paths
  app.get(["/api/unit/:slug/clients/cpf/:cpf", "/api/units/:slug/clients/cpf/:cpf"], requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const cpf = req.params.cpf;
      
      // Remove formatting from CPF (keep only numbers)
      const sanitizedCpf = cpf.replace(/\D/g, '');
      
      // Get all clients
      const allClients = await storage.getAllClients();
      
      // Find client by CPF (match both formatted and unformatted)
      const client = allClients.find((c: any) => {
        const clientCpf = c.cpf?.replace(/\D/g, '');
        return clientCpf === sanitizedCpf;
      });
      
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado com este CPF" });
      }
      
      // Remove sensitive data
      const { password: _, cpfHash: __, ...clientData } = client as any;
      
      res.json(clientData);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching client by CPF:", error);
      res.status(500).json({ error: "Erro ao buscar cliente" });
    }
  });

  // Get pets by client ID (authenticated) - supports both /api/unit and /api/units paths
  app.get(["/api/unit/:slug/clients/:clientId/pets", "/api/units/:slug/clients/:clientId/pets"], requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const clientId = req.params.clientId;
      
      // Get pets for this client  
      const pets = await storage.getPetsByClientId(clientId);
      
      res.json(pets || []);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching client pets:", error);
      res.status(500).json({ error: "Erro ao buscar pets do cliente" });
    }
  });

  // Get atendimentos history for a specific pet (unit)
  app.get(["/api/unit/:slug/pets/:petId/atendimentos", "/api/units/:slug/pets/:petId/atendimentos"], requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const petId = req.params.petId;
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Get atendimentos for this unit
      const result = await storage.getAtendimentosWithNetworkUnits({
        networkUnitId: unitId
      });
      const allAtendimentos = result?.atendimentos || [];
      
      // Filter by petId
      const petAtendimentos = allAtendimentos.filter(
        (atendimento: any) => atendimento.petId === petId
      );
      
      // Sort by date descending (newest first)
      petAtendimentos.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      res.json(petAtendimentos);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching pet atendimentos:", error);
      res.status(500).json({ error: "Erro ao buscar histórico de atendimentos" });
    }
  });

  // Get available procedures for a pet based on their plan and usage
  app.get(["/api/unit/:slug/pets/:petId/available-procedures", "/api/units/:slug/pets/:petId/available-procedures"], requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const petId = req.params.petId;
      const year = new Date().getFullYear();
      
      // Get pet with plan
      const pet = await storage.getPet(petId);
      if (!pet) {
        return res.status(404).json({ error: "Pet não encontrado" });
      }
      
      if (!pet.planId) {
        return res.json({ procedures: [], message: "Pet sem plano" });
      }
      
      // Get procedures for this pet's plan
      const planProcedures = await storage.getPlanProceduresWithDetails(pet.planId);
      
      // Get usage for this pet
      const usage = await storage.getProcedureUsageByPet(petId, year);
      
      // Map procedures with availability
      const availableProcedures = planProcedures.map((pp: any) => {
        // Find usage for this procedure
        const usageRecord = usage.find((u: any) => u.procedureId === pp.procedureId);
        
        // Extract numeric limit from limitesAnuais string
        let annualLimit = 0;
        if (pp.limitesAnuais) {
          const match = pp.limitesAnuais.match(/(\d+)/);
          if (match) {
            annualLimit = parseInt(match[1], 10);
          }
        }
        
        const usedCount = usageRecord ? usageRecord.usageCount : 0;
        const remaining = Math.max(0, annualLimit - usedCount);
        
        // Calculate waiting period days remaining
        let waitingDaysRemaining = 0;
        if (pp.carencia) {
          const carenciaMatch = pp.carencia.match(/(\d+)/);
          if (carenciaMatch) {
            const waitingDaysTotal = parseInt(carenciaMatch[1], 10);
            const petCreatedDate = new Date(pet.createdAt);
            const currentDate = new Date();
            const daysSinceRegistered = Math.floor((currentDate.getTime() - petCreatedDate.getTime()) / (1000 * 60 * 60 * 24));
            waitingDaysRemaining = Math.max(0, waitingDaysTotal - daysSinceRegistered);
          }
        }
        
        const canUse = remaining > 0 && waitingDaysRemaining === 0;
        
        return {
          id: pp.procedureId,
          name: pp.procedureName,
          annualLimit: annualLimit,
          used: usedCount,
          remaining: remaining,
          canUse: canUse,
          waitingDaysRemaining: waitingDaysRemaining,
          coparticipation: pp.coparticipacao ? pp.coparticipacao / 100 : 0
        };
      }).filter((p: any) => p.canUse && p.annualLimit > 0); // Only return usable procedures
      
      res.json({
        procedures: availableProcedures,
        petName: pet.name,
        planId: pet.planId
      });
      
    } catch (error) {
      console.error("❌ [UNIT] Error fetching available procedures:", error);
      res.status(500).json({ error: "Erro ao buscar procedimentos disponíveis" });
    }
  });

  // Search clients (authenticated)
  app.get("/api/unit/:slug/clients/search/:query", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      const query = req.params.query;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      const allClients = await storage.getAllClients();
      
      // Filter only unit's clients and search by name, email, phone or CPF
      const results = allClients.filter((client: any) => 
        client.createdByUnitId === unitId && (
        client.fullName?.toLowerCase().includes(query.toLowerCase()) ||
        client.email?.toLowerCase().includes(query.toLowerCase()) ||
        client.phone?.includes(query) ||
        client.cpf?.includes(query)
      ));
      
      res.json(results);
    } catch (error) {
      console.error("❌ [UNIT] Error searching clients:", error);
      res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  });

  // ===== VETERINARIANS MANAGEMENT =====
  
  // Veterinarian login
  app.post("/api/veterinarian-auth/login", async (req: Request, res: Response) => {
    try {
      const { login, password } = req.body;
      
      if (!login || !password) {
        return res.status(400).json({ error: "Dados incompletos" });
      }
      
      const veterinarian = await storage.getVeterinarianByLogin(login);
      if (!veterinarian) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      
      // Check if veterinarian is active
      if (!veterinarian.isActive) {
        return res.status(401).json({ error: "Veterinário inativo" });
      }
      
      // Check if has access to atendimentos
      if (!veterinarian.canAccessAtendimentos) {
        return res.status(401).json({ error: "Acesso não autorizado" });
      }
      
      // Verify password
      if (!veterinarian.passwordHash) {
        return res.status(401).json({ error: "Credenciais não configuradas" });
      }
      
      const isValidPassword = await bcrypt.compare(password, veterinarian.passwordHash);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      
      // ✅ SECURITY FIX: Enforce SESSION_SECRET without fallback
      if (!process.env.SESSION_SECRET) {
        console.error('❌ [SECURITY] SESSION_SECRET not configured for JWT');
        return res.status(500).json({ error: 'Configuração de segurança ausente' });
      }
      
      // Get unit info
      const unit = await storage.getNetworkUnitById(veterinarian.networkUnitId);
      if (!unit) {
        return res.status(500).json({ error: "Erro ao buscar informações da unidade" });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          veterinarianId: veterinarian.id,
          unitId: veterinarian.networkUnitId,
          slug: unit.urlSlug,
          type: 'veterinarian'
        },
        process.env.SESSION_SECRET,
        { expiresIn: '8h' }
      );
      
      console.log(`✅ [VET-AUTH] Veterinarian logged in: ${veterinarian.name}`);
      res.json({ 
        token, 
        veterinarianName: veterinarian.name,
        unitName: unit.name,
        unitSlug: unit.urlSlug
      });
    } catch (error) {
      console.error("❌ [VET-AUTH] Login error:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });
  
  // Get all veterinarians for a unit (authenticated)
  app.get("/api/units/:slug/veterinarios", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      const veterinarians = await storage.getVeterinariansByUnitId(unitId);
      res.json(veterinarians);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching veterinarians:", error);
      res.status(500).json({ error: "Erro ao buscar veterinários" });
    }
  });

  // Get a specific veterinarian (authenticated)
  app.get("/api/units/:slug/veterinarios/:id", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      const { id } = req.params;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      const veterinarian = await storage.getVeterinarianById(id);
      
      if (!veterinarian) {
        return res.status(404).json({ error: "Veterinário não encontrado" });
      }
      
      // Verify veterinarian belongs to this unit
      if (veterinarian.networkUnitId !== unitId) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      res.json(veterinarian);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching veterinarian:", error);
      res.status(500).json({ error: "Erro ao buscar veterinário" });
    }
  });

  // Create a new veterinarian (authenticated)
  app.post("/api/units/:slug/veterinarios", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      const { name, crmv, email, phone, specialty, type, login, password, canAccessAtendimentos } = req.body;
      
      // Validate required fields
      if (!name || !crmv || !email || !phone || !type) {
        return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });
      }
      
      // Hash password if provided
      let passwordHash = null;
      if (login && password) {
        passwordHash = await bcrypt.hash(password, 10);
      }
      
      const veterinarian = await storage.createVeterinarian({
        networkUnitId: unitId,
        name,
        crmv,
        email,
        phone,
        specialty: specialty || null,
        type,
        login: login || null,
        passwordHash,
        canAccessAtendimentos: canAccessAtendimentos || false,
        isActive: true
      });
      
      console.log(`✅ [UNIT] Veterinarian created: ${veterinarian.name}`);
      res.status(201).json(veterinarian);
    } catch (error) {
      console.error("❌ [UNIT] Error creating veterinarian:", error);
      res.status(500).json({ error: "Erro ao criar veterinário" });
    }
  });

  // Update a veterinarian (authenticated)
  app.put("/api/units/:slug/veterinarios/:id", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      const { id } = req.params;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Verify veterinarian exists and belongs to this unit
      const existing = await storage.getVeterinarianById(id);
      if (!existing) {
        return res.status(404).json({ error: "Veterinário não encontrado" });
      }
      if (existing.networkUnitId !== unitId) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      const { name, crmv, email, phone, specialty, type, login, password, canAccessAtendimentos, isActive } = req.body;
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (crmv !== undefined) updateData.crmv = crmv;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (specialty !== undefined) updateData.specialty = specialty;
      if (type !== undefined) updateData.type = type;
      if (login !== undefined) updateData.login = login;
      if (canAccessAtendimentos !== undefined) updateData.canAccessAtendimentos = canAccessAtendimentos;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      // Hash new password if provided
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }
      
      const veterinarian = await storage.updateVeterinarian(id, updateData);
      
      console.log(`✅ [UNIT] Veterinarian updated: ${veterinarian?.name}`);
      res.json(veterinarian);
    } catch (error) {
      console.error("❌ [UNIT] Error updating veterinarian:", error);
      res.status(500).json({ error: "Erro ao atualizar veterinário" });
    }
  });

  // Delete a veterinarian (authenticated)
  app.delete("/api/units/:slug/veterinarios/:id", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      const { id } = req.params;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Verify veterinarian exists and belongs to this unit
      const existing = await storage.getVeterinarianById(id);
      if (!existing) {
        return res.status(404).json({ error: "Veterinário não encontrado" });
      }
      if (existing.networkUnitId !== unitId) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      const success = await storage.deleteVeterinarian(id);
      
      if (success) {
        console.log(`✅ [UNIT] Veterinarian deleted: ${existing.name}`);
        res.json({ success: true, message: "Veterinário removido com sucesso" });
      } else {
        res.status(500).json({ error: "Erro ao remover veterinário" });
      }
    } catch (error) {
      console.error("❌ [UNIT] Error deleting veterinarian:", error);
      res.status(500).json({ error: "Erro ao remover veterinário" });
    }
  });
}