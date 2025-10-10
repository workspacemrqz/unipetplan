import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { IStorage } from './storage.js';

interface UnitRequest extends Request {
  unit?: {
    unitId: string;
    slug: string;
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
  
  // Middleware to verify unit authentication
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
        req.unit = decoded;
        next();
      } catch (err) {
        return res.status(401).json({ error: "Token inválido" });
      }
    } catch (error) {
      console.error("❌ [UNIT-AUTH] Auth middleware error:", error);
      res.status(500).json({ error: "Erro de autenticação" });
    }
  };
  
  // Get unit guides (authenticated) - supports both /api/unit and /api/units paths
  app.get(["/api/unit/:slug/guides", "/api/units/:slug/guides"], requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Get query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const type = req.query.type as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Get guides with network units info
      const result = await storage.getGuidesWithNetworkUnits({
        page,
        limit,
        search,
        status: status !== 'all' ? status : undefined,
        type: type !== 'all' ? type : undefined,
        startDate,
        endDate
      });
      
      // Filter to only show guides created by this unit
      const allGuides = result?.data || [];
      const unitGuides = allGuides.filter((guide: any) => guide.createdByUnitId === unitId);
      
      // Recalculate pagination for filtered results
      const filteredTotal = unitGuides.length;
      const totalPages = Math.ceil(filteredTotal / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedGuides = unitGuides.slice(startIndex, endIndex);
      
      res.json({
        data: paginatedGuides,
        total: filteredTotal,
        totalPages,
        page
      });
    } catch (error) {
      console.error("❌ [UNIT] Error fetching guides:", error);
      res.status(500).json({ error: "Erro ao buscar guias" });
    }
  });
  
  // Create new guide (authenticated)
  app.post(["/api/unit/:slug/guides", "/api/units/:slug/guides"], requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      const guideData = req.body;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Add unit ID to track which unit created this guide
      const newGuide = await storage.createGuide({
        ...guideData,
        networkUnitId: unitId,
        createdByUnitId: unitId
      });
      
      // Automatically register procedure usage when guide is created
      if (guideData.petId && guideData.procedureId) {
        try {
          const year = new Date().getFullYear();
          
          // Get pet's plan to check procedure limits
          const pet = await storage.getPet(guideData.petId);
          if (pet && pet.planId) {
            const plan = await storage.getPlan(pet.planId);
            if (plan) {
              // Find procedure in plan to get limit - fetch from database
              const planProcedures = await storage.getPlanProceduresWithDetails(pet.planId);
              const procedureInPlan = planProcedures.find((p: any) => p.procedureId === guideData.procedureId);
              
              if (procedureInPlan && procedureInPlan.annualLimit) {
                // Get current usage
                const usageRecords = await storage.getProcedureUsageByPet(guideData.petId, year);
                const currentUsage = usageRecords.find((u: any) => u.procedureId === guideData.procedureId && u.planId === pet.planId);
                const used = currentUsage?.usageCount || 0;
                const remaining = procedureInPlan.annualLimit - used;
                
                // Only register if there's remaining limit
                if (remaining > 0) {
                  await storage.incrementProcedureUsage(guideData.petId, guideData.procedureId, pet.planId);
                  console.log(`✅ [UNIT] Procedure usage automatically registered for pet ${guideData.petId}, procedure ${guideData.procedureId}`);
                } else {
                  console.log(`⚠️ [UNIT] Procedure limit reached for pet ${guideData.petId}, procedure ${guideData.procedureId}`);
                }
              }
            }
          }
        } catch (error) {
          // Log error but don't fail the guide creation
          console.error("❌ [UNIT] Error registering procedure usage:", error);
        }
      }
      
      console.log(`✅ [UNIT] Guide created by unit ${unitId}:`, newGuide.id);
      res.status(201).json(newGuide);
    } catch (error) {
      console.error("❌ [UNIT] Error creating guide:", error);
      res.status(500).json({ error: "Erro ao criar guia" });
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
          category: proc.category || 'Guia',
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
          category: proc.category || 'Guia',
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

  // Get pets by client ID (authenticated)
  app.get("/api/unit/:slug/clients/:clientId/pets", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      const clientId = req.params.clientId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // First check if client belongs to this unit
      const allClients = await storage.getAllClients();
      const client = allClients.find((c: any) => c.id === clientId && c.createdByUnitId === unitId);
      
      if (!client) {
        return res.status(404).json({ error: "Cliente não encontrado para esta unidade" });
      }
      
      // Get pets for this client  
      const pets = await storage.getPetsByClientId(clientId);
      // Filter to only show pets created by this unit
      const unitPets = pets.filter((pet: any) => pet.createdByUnitId === unitId);
      
      res.json(unitPets || []);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching client pets:", error);
      res.status(500).json({ error: "Erro ao buscar pets do cliente" });
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
}