import type { Express } from "express";
import type { IStorage } from "./storage.js";

export function setupProcedureUsageRoutes(app: Express, storage: IStorage) {
  // Middleware to check client authentication
  const requireClient = (req: any, res: any, next: any) => {
    if (!req.session) {
      return res.status(401).json({ error: "Cliente não autenticado - sem sessão" });
    }
    if (!req.session.client) {
      return res.status(401).json({ error: "Cliente não autenticado - não logado" });
    }
    next();
  };

  // Get procedure usage for client's pets
  app.get("/api/clients/procedure-usage", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }
      
      // Get current year or use query param
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      
      // Get all procedure usage for the client's pets
      const usage = await storage.getProcedureUsageByClient(clientId, year);
      
      // Get pets with their plans
      const pets = await storage.getPetsByClientId(clientId);
      const petsWithPlans = await Promise.all(
        pets.map(async (pet) => {
          const plan = pet.planId ? await storage.getPlan(pet.planId) : null;
          
          // Get procedures for this pet's plan
          let procedures: any[] = [];
          if (plan) {
            const planProcedures = await storage.getPlanProceduresWithDetails(plan.id);
            
            // Map procedures with usage data
            procedures = planProcedures.map((pp: any) => {
              // Find usage for this procedure and pet
              const usageRecord = usage.find((u: any) => 
                u.petId === pet.id && u.procedureId === pp.procedureId
              );
              
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
              let waitingDaysTotal = 0;
              if (pp.carencia) {
                // Extract numeric days from carencia string (e.g., "30 dias")
                const carenciaMatch = pp.carencia.match(/(\d+)/);
                if (carenciaMatch) {
                  waitingDaysTotal = parseInt(carenciaMatch[1], 10);
                  // Calculate days since pet was registered
                  const petCreatedDate = new Date(pet.createdAt);
                  const currentDate = new Date();
                  const daysSinceRegistered = Math.floor((currentDate.getTime() - petCreatedDate.getTime()) / (1000 * 60 * 60 * 24));
                  waitingDaysRemaining = Math.max(0, waitingDaysTotal - daysSinceRegistered);
                }
              }
              
              // Convert coparticipacao from cents to reais
              const coparticipation = pp.coparticipacao ? pp.coparticipacao / 100 : 0;
              
              return {
                id: pp.procedureId,
                name: pp.procedureName,
                type: pp.procedureType,
                annualLimit: annualLimit,
                used: usedCount,
                remaining: remaining,
                canUse: remaining > 0 && waitingDaysRemaining === 0,
                waitingDaysRemaining: waitingDaysRemaining,
                waitingDaysTotal: waitingDaysTotal,
                coparticipation: coparticipation,
                petCreatedAt: pet.createdAt
              };
            }).filter((p: any) => p.annualLimit > 0); // Only show procedures with limits
          }
          
          return {
            id: pet.id,
            name: pet.name,
            species: pet.species,
            planName: plan ? plan.name : 'Sem plano',
            planId: plan ? plan.id : null,
            createdAt: pet.createdAt,
            procedures: procedures
          };
        })
      );
      
      res.json({
        year: year,
        pets: petsWithPlans,
        message: "Uso de procedimentos recuperado com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error fetching procedure usage:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });
  
  // Register procedure usage
  app.post("/api/clients/procedure-usage", requireClient, async (req, res) => {
    try {
      const clientId = req.session.client?.id;
      const { petId, procedureId } = req.body;
      
      if (!clientId) {
        return res.status(401).json({ error: "Cliente não autenticado" });
      }
      
      if (!petId || !procedureId) {
        return res.status(400).json({ error: "Pet e procedimento são obrigatórios" });
      }
      
      // Verify pet belongs to client
      const pet = await storage.getPet(petId);
      if (!pet) {
        return res.status(404).json({ error: "Pet não encontrado" });
      }
      
      if (pet.clientId !== clientId) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      if (!pet.planId) {
        return res.status(400).json({ error: "Pet não possui plano ativo" });
      }
      
      // Check if procedure is included in plan and has limit
      const planProcedures = await storage.getPlanProceduresWithDetails(pet.planId);
      const planProcedure = planProcedures.find((pp: any) => pp.procedureId === procedureId);
      
      if (!planProcedure) {
        return res.status(400).json({ error: "Procedimento não está incluído no plano" });
      }
      
      // Extract numeric limit from limitesAnuais string
      let annualLimit = 0;
      if (planProcedure.limitesAnuais) {
        const match = planProcedure.limitesAnuais.match(/(\d+)/);
        if (match) {
          annualLimit = parseInt(match[1], 10);
        }
      }
      
      if (annualLimit === 0) {
        return res.status(400).json({ error: "Este procedimento não possui limite anual" });
      }
      
      // Check current usage
      const currentYear = new Date().getFullYear();
      const currentUsage = await storage.getProcedureUsageByPet(petId, currentYear);
      const usageRecord = currentUsage.find((u: any) => u.procedureId === procedureId);
      const currentCount = usageRecord ? usageRecord.usageCount : 0;
      
      if (currentCount >= annualLimit) {
        return res.status(400).json({ 
          error: "Limite anual excedido", 
          limit: annualLimit,
          used: currentCount 
        });
      }
      
      // Increment usage
      const updatedUsage = await storage.incrementProcedureUsage(petId, procedureId, pet.planId);
      
      res.json({
        usage: {
          procedureId: updatedUsage.procedureId,
          petId: updatedUsage.petId,
          year: updatedUsage.year,
          used: updatedUsage.usageCount,
          limit: annualLimit,
          remaining: annualLimit - updatedUsage.usageCount
        },
        message: "Uso registrado com sucesso"
      });
      
    } catch (error) {
      console.error("❌ Error registering procedure usage:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  console.log("✅ Procedure usage routes registered successfully");
}