import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { IStorage } from './storage.js';
import { db } from './db.js';
import { atendimentos, atendimentoProcedures, veterinarians, type InsertVeterinarian } from '../shared/schema.js';
import { sql, eq, and, inArray } from 'drizzle-orm';
import { normalizeTextField } from './lib/text-formatter.js';

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
      const search = req.query.search as string;
      
      // Build filters based on user type
      const filters: any = {
        networkUnitId: unitId,
        status: status !== 'all' ? status : undefined
      };
      
      // If it's a veterinarian, filter by their ID
      if (req.unit?.type === 'veterinarian' && req.unit?.veterinarianId) {
        filters.veterinarianId = req.unit.veterinarianId;
        console.log(`✅ [UNIT] Filtering atendimentos for veterinarian ${req.unit.veterinarianId}`);
      }
      
      // Get atendimentos with filters
      const result = await storage.getAtendimentosWithNetworkUnits(filters);
      
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
      
      // Apply search filter if present
      if (search) {
        const searchLower = search.toLowerCase();
        // Normalize search term for CPF (remove special characters)
        const normalizedSearch = search.replace(/\D/g, '');
        
        allAtendimentos = allAtendimentos.filter((atendimento: any) => {
          // Search in clientName
          if (atendimento.clientName && atendimento.clientName.toLowerCase().includes(searchLower)) {
            return true;
          }
          // Search in clientCpf (normalized)
          if (atendimento.clientCpf) {
            const normalizedCpf = atendimento.clientCpf.replace(/\D/g, '');
            if (normalizedCpf.includes(normalizedSearch)) {
              return true;
            }
          }
          // Search in petName
          if (atendimento.petName && atendimento.petName.toLowerCase().includes(searchLower)) {
            return true;
          }
          // Search in procedure names
          if (atendimento.procedure && atendimento.procedure.toLowerCase().includes(searchLower)) {
            return true;
          }
          // Search in procedures array
          if (atendimento.procedures && atendimento.procedures.length > 0) {
            const hasMatchingProcedure = atendimento.procedures.some((proc: any) => {
              const procName = proc.procedureName || proc.name || '';
              return procName.toLowerCase().includes(searchLower);
            });
            if (hasMatchingProcedure) return true;
          }
          // Search in notes
          if (atendimento.procedureNotes && atendimento.procedureNotes.toLowerCase().includes(searchLower)) {
            return true;
          }
          if (atendimento.generalNotes && atendimento.generalNotes.toLowerCase().includes(searchLower)) {
            return true;
          }
          return false;
        });
      }
      
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
  
  // Get dashboard statistics (authenticated) - aggregated counts from database
  app.get("/api/units/:slug/dashboard-stats", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Build conditions based on user type
      const conditions: any[] = [eq(atendimentos.createdByUnitId, unitId)];
      
      // If it's a veterinarian, filter by their ID
      if (req.unit?.type === 'veterinarian' && req.unit?.veterinarianId) {
        conditions.push(eq(atendimentos.veterinarianId, req.unit.veterinarianId));
        console.log(`✅ [UNIT] Filtering dashboard stats for veterinarian ${req.unit.veterinarianId}`);
      }
      
      // Add date range filters if provided
      const { startDate, endDate } = req.query;
      
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        conditions.push(sql`${atendimentos.createdAt} >= ${start.toISOString()}`);
        console.log(`✅ [UNIT] Filtering dashboard stats from date: ${start.toISOString()}`);
      }
      
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(sql`${atendimentos.createdAt} <= ${end.toISOString()}`);
        console.log(`✅ [UNIT] Filtering dashboard stats to date: ${end.toISOString()}`);
      }
      
      // Count DISTINCT clients using SQL aggregation
      const uniqueClientsResult = await db
        .select({ count: sql<number>`count(distinct ${atendimentos.clientId})` })
        .from(atendimentos)
        .where(and(...conditions));
      
      // Count DISTINCT pets using SQL aggregation
      const uniquePetsResult = await db
        .select({ count: sql<number>`count(distinct ${atendimentos.petId})` })
        .from(atendimentos)
        .where(and(...conditions));
      
      // Count total atendimentos
      const totalAtendimentosResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(atendimentos)
        .where(and(...conditions));
      
      const uniqueClients = uniqueClientsResult[0]?.count || 0;
      const uniquePets = uniquePetsResult[0]?.count || 0;
      const totalAtendimentos = totalAtendimentosResult[0]?.count || 0;
      
      const dateInfo = startDate || endDate ? ` (filtered: ${startDate || 'any'} to ${endDate || 'any'})` : '';
      console.log(`✅ [UNIT] Dashboard stats for unit ${unitId}${dateInfo}: ${totalAtendimentos} atendimentos, ${uniqueClients} unique clients, ${uniquePets} unique pets`);
      
      res.json({
        uniqueClients: Number(uniqueClients),
        uniquePets: Number(uniquePets),
        totalAtendimentos: Number(totalAtendimentos)
      });
    } catch (error) {
      console.error("❌ [UNIT] Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas do dashboard" });
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
      
      // ✅ VALIDAR STATUS DO CONTRATO DO PET
      if (atendimentoData.petId) {
        const petContracts = await storage.getContractsByPetId(atendimentoData.petId);
        
        // Verificar se há contrato suspenso
        const suspendedContract = petContracts.find((contract: any) => contract.status === 'suspended');
        if (suspendedContract) {
          return res.status(403).json({ 
            error: "Plano suspenso",
            message: "Não é possível criar atendimento. O plano deste pet está suspenso. Por favor, regularize o contrato antes de continuar.",
            contractStatus: 'suspended',
            contractId: suspendedContract.id
          });
        }
        
        // Verificar se há contrato cancelado
        const cancelledContract = petContracts.find((contract: any) => contract.status === 'cancelled');
        if (cancelledContract) {
          return res.status(403).json({ 
            error: "Plano cancelado",
            message: "Não é possível criar atendimento. O plano deste pet foi cancelado.",
            contractStatus: 'cancelled',
            contractId: cancelledContract.id
          });
        }
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
      
      // If it's a veterinarian creating the atendimento, add their ID
      if (req.unit?.type === 'veterinarian' && req.unit?.veterinarianId) {
        processedData.veterinarianId = req.unit.veterinarianId;
        console.log(`✅ [UNIT] Atendimento being created by veterinarian ${req.unit.veterinarianId}`);
      }
      
      // Add unit ID to track which unit created this atendimento
      const newAtendimento = await storage.createAtendimento(processedData);
      
      // Salvar múltiplos procedimentos na tabela de relacionamento
      if (procedures && procedures.length > 0) {
        await storage.createAtendimentoProcedures(newAtendimento.id, procedures);
        console.log(`✅ [UNIT] Saved ${procedures.length} procedures for atendimento ${newAtendimento.id}`);
      }
      
      // Create history log for atendimento creation
      const unitInfo = req.unit;
      let userName = 'Unidade';
      let userType = 'unit';
      
      if (unitInfo?.type === 'veterinarian' && unitInfo?.veterinarianId) {
        // Get veterinarian name if possible
        const veterinarian = await storage.getVeterinarianById(unitInfo.veterinarianId);
        userName = veterinarian?.name || `Veterinário ${unitInfo.veterinarianId}`;
        userType = 'veterinarian';
      } else if (unitInfo?.unitId) {
        // Get unit name if possible
        const unit = await storage.getNetworkUnitById(unitInfo.unitId);
        userName = unit?.name || `Unidade ${unitInfo.unitId}`;
      }
      
      await storage.createAtendimentoHistoryLog({
        atendimentoId: newAtendimento.id,
        actionType: 'created',
        fieldName: null,
        oldValue: null,
        newValue: null,
        userName: userName,
        userId: unitInfo?.veterinarianId || unitInfo?.unitId || null,
        userType: userType,
        description: `Atendimento criado por ${userName}`
      });
      
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
      
      // Extract date filter parameters and search
      const { startDate, endDate, search } = req.query;
      
      // Get atendimentos for this unit with network unit info
      const result = await storage.getAtendimentosWithNetworkUnits({
        networkUnitId: unitId
      });
      
      let allAtendimentos = result?.atendimentos || [];
      
      // Apply date filtering if provided
      if (startDate || endDate) {
        allAtendimentos = allAtendimentos.filter((atendimento: any) => {
          if (!atendimento.createdAt) return false;
          
          const atendimentoDate = new Date(atendimento.createdAt);
          
          if (startDate) {
            const start = new Date(startDate as string);
            if (atendimentoDate < start) return false;
          }
          
          if (endDate) {
            // Set endDate to end of day (23:59:59.999) to include all records from that day
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            if (atendimentoDate > end) return false;
          }
          
          return true;
        });
      }
      
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
      
      // Apply search filter if present (after procedures are loaded)
      if (search && typeof search === 'string' && search.trim()) {
        const searchLower = search.toLowerCase();
        // Normalize search term for CPF (remove special characters)
        const normalizedSearch = search.replace(/\D/g, '');
        
        allAtendimentos = allAtendimentos.filter((atendimento: any) => {
          // Search in clientName
          if (atendimento.clientName && atendimento.clientName.toLowerCase().includes(searchLower)) {
            return true;
          }
          // Search in clientCpf (normalized)
          if (atendimento.clientCpf) {
            const normalizedCpf = atendimento.clientCpf.replace(/\D/g, '');
            if (normalizedCpf.includes(normalizedSearch)) {
              return true;
            }
          }
          // Search in petName
          if (atendimento.petName && atendimento.petName.toLowerCase().includes(searchLower)) {
            return true;
          }
          // Search in procedures
          if (atendimento.procedures && atendimento.procedures.length > 0) {
            const hasMatchingProcedure = atendimento.procedures.some((proc: any) => {
              const procName = proc.procedureName || proc.name || '';
              return procName.toLowerCase().includes(searchLower);
            });
            if (hasMatchingProcedure) return true;
          }
          // Search in legacy procedure field
          if (atendimento.procedure && atendimento.procedure.toLowerCase().includes(searchLower)) {
            return true;
          }
          return false;
        });
      }
      
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
      
      // Create history log before update
      const unitInfo = req.unit;
      let userName = 'Unidade';
      let userType = 'unit';
      
      if (unitInfo?.type === 'veterinarian' && unitInfo?.veterinarianId) {
        // Get veterinarian name if possible
        const veterinarian = await storage.getVeterinarianById(unitInfo.veterinarianId);
        userName = veterinarian?.name || `Veterinário ${unitInfo.veterinarianId}`;
        userType = 'veterinarian';
      } else if (unitInfo?.unitId) {
        // Get unit name if possible
        const unit = await storage.getNetworkUnitById(unitInfo.unitId);
        userName = unit?.name || `Unidade ${unitInfo.unitId}`;
      }
      
      const statusLabels: Record<string, string> = {
        'open': 'Aberta',
        'closed': 'Concluída',
        'cancelled': 'Cancelada'
      };
      
      await storage.createAtendimentoHistoryLog({
        atendimentoId: atendimentoId,
        actionType: 'status_changed',
        fieldName: 'status',
        oldValue: atendimento.status,
        newValue: status,
        userName: userName,
        userId: unitInfo?.veterinarianId || unitInfo?.unitId || null,
        userType: userType,
        description: `Status alterado de "${statusLabels[atendimento.status as string] || atendimento.status}" para "${statusLabels[status as string] || status}" por ${userName}`
      });
      
      // Update the atendimento status
      const updatedAtendimento = await storage.updateAtendimento(atendimentoId, { status });
      
      console.log(`✅ [UNIT] Atendimento ${atendimentoId} status updated by unit ${unitId} to ${status}`);
      res.json(updatedAtendimento);
    } catch (error) {
      console.error("❌ [UNIT] Error updating atendimento:", error);
      res.status(500).json({ error: "Erro ao atualizar atendimento" });
    }
  });
  
  // Get atendimento history (authenticated)
  app.get(["/api/unit/:slug/atendimentos/:id/history", "/api/units/:slug/atendimentos/:id/history"], requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      const atendimentoId = req.params.id;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Verify that the atendimento was created by this unit
      const atendimento = await storage.getAtendimento(atendimentoId);
      if (!atendimento) {
        return res.status(404).json({ error: "Atendimento não encontrado" });
      }
      
      if (atendimento.createdByUnitId !== unitId) {
        return res.status(403).json({ error: "Você não tem permissão para visualizar o histórico deste atendimento" });
      }
      
      // Get history logs for this atendimento
      const history = await storage.getAtendimentoHistory(atendimentoId);
      
      console.log(`✅ [UNIT] Retrieved ${history.length} history logs for atendimento ${atendimentoId}`);
      res.json(history);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching atendimento history:", error);
      res.status(500).json({ error: "Erro ao buscar histórico do atendimento" });
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
        fullName: normalizeTextField(clientData.full_name || clientData.fullName),
        email: clientData.email,
        phone: clientData.phone,
        cpf: clientData.cpf,
        cep: clientData.cep,
        address: normalizeTextField(clientData.address),
        number: clientData.number,
        complement: clientData.complement,
        district: normalizeTextField(clientData.district),
        state: clientData.state,
        city: normalizeTextField(clientData.city),
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
      if (clientData.full_name !== undefined) dbClientData.fullName = normalizeTextField(clientData.full_name);
      if (clientData.fullName !== undefined) dbClientData.fullName = normalizeTextField(clientData.fullName);
      if (clientData.email !== undefined) dbClientData.email = clientData.email;
      if (clientData.phone !== undefined) dbClientData.phone = clientData.phone;
      if (clientData.cpf !== undefined) dbClientData.cpf = clientData.cpf;
      if (clientData.cep !== undefined) dbClientData.cep = clientData.cep;
      if (clientData.address !== undefined) dbClientData.address = normalizeTextField(clientData.address);
      if (clientData.number !== undefined) dbClientData.number = clientData.number;
      if (clientData.complement !== undefined) dbClientData.complement = clientData.complement;
      if (clientData.district !== undefined) dbClientData.district = normalizeTextField(clientData.district);
      if (clientData.state !== undefined) dbClientData.state = clientData.state;
      if (clientData.city !== undefined) dbClientData.city = normalizeTextField(clientData.city);
      
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
        name: normalizeTextField(petData.name),
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
      
      // Get plan details to check if it's INFINITY
      const plan = await storage.getPlan(pet.planId);
      const isInfinityPlan = plan && plan.name.toUpperCase().includes('INFINITY');
      
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
        let isUnlimited = false;
        
        if (pp.limitesAnuais) {
          // Check for unlimited indicators
          const unlimitedKeywords = ['ilimitado', 'sem limite', 'unlimited', 'infinity'];
          const limitString = pp.limitesAnuais.toLowerCase();
          
          if (unlimitedKeywords.some(keyword => limitString.includes(keyword))) {
            isUnlimited = true;
            annualLimit = -1; // Use -1 to indicate unlimited
          } else {
            const match = pp.limitesAnuais.match(/(\d+)/);
            if (match) {
              annualLimit = parseInt(match[1], 10);
            }
          }
        }
        
        // For INFINITY plan, treat no limit as unlimited
        if (isInfinityPlan && annualLimit === 0) {
          isUnlimited = true;
          annualLimit = -1;
        }
        
        const usedCount = usageRecord ? usageRecord.usageCount : 0;
        const remaining = isUnlimited ? -1 : Math.max(0, annualLimit - usedCount);
        
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
        
        // For unlimited procedures, always allow usage (if no waiting period)
        const canUse = (isUnlimited || remaining > 0) && waitingDaysRemaining === 0;
        
        return {
          id: pp.procedureId,
          name: pp.procedureName,
          annualLimit: annualLimit,
          used: usedCount,
          remaining: remaining,
          canUse: canUse,
          waitingDaysRemaining: waitingDaysRemaining,
          coparticipation: pp.coparticipacao ? pp.coparticipacao / 100 : 0,
          isUnlimited: isUnlimited
        };
      }); // Return all procedures with their status (let frontend handle enablement)
      
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

  // ✅ Get contracts for a specific pet (authenticated)
  app.get(["/api/unit/:slug/pets/:petId/contracts", "/api/units/:slug/pets/:petId/contracts"], requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const petId = req.params.petId;
      const contracts = await storage.getContractsByPetId(petId);
      res.json(contracts);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching pet contracts:", error);
      res.status(500).json({ error: "Erro ao buscar contratos do pet" });
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

  // Update pet weight (authenticated)
  app.put("/api/units/:slug/pets/:petId/weight", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const { petId } = req.params;
      const { weight } = req.body;
      const unitId = req.unit?.unitId;
      const veterinarianId = req.unit?.veterinarianId;
      const userType = req.unit?.type || 'unit';
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Validate weight
      if (weight === undefined || weight === null) {
        return res.status(400).json({ error: "Peso é obrigatório" });
      }
      
      const weightNum = parseFloat(weight);
      if (isNaN(weightNum) || weightNum <= 0) {
        return res.status(400).json({ error: "Peso deve ser um número positivo" });
      }
      
      // Get current pet data to check old weight
      const pet = await storage.getPet(petId);
      if (!pet) {
        return res.status(404).json({ error: "Pet não encontrado" });
      }
      
      const oldWeight = pet.weight ? parseFloat(pet.weight.toString()) : 0;
      
      // Update pet weight
      const updatedPet = await storage.updatePet(petId, { weight: weightNum.toString() });
      
      if (!updatedPet) {
        return res.status(500).json({ error: "Erro ao atualizar peso do pet" });
      }
      
      // Log the weight update action
      const logData = {
        petId: petId,
        petName: pet.name,
        oldWeight: oldWeight,
        newWeight: weightNum,
        changedBy: userType === 'veterinarian' ? 'veterinarian' : 'unit_admin',
        veterinarianId: veterinarianId || null,
        unitId: unitId
      };
      
      await storage.createActionLog({
        networkUnitId: unitId,
        actionType: 'pet_weight_updated',
        userType: userType === 'veterinarian' ? 'veterinarian' : 'unit',
        veterinarianId: veterinarianId || undefined,
        actionData: logData,
        createdAt: new Date()
      });
      
      console.log(`✅ [UNIT] Pet weight updated: ${pet.name} - Old: ${oldWeight}kg, New: ${weightNum}kg`);
      
      res.json({ 
        success: true,
        message: "Peso atualizado com sucesso",
        pet: updatedPet
      });
      
    } catch (error) {
      console.error("❌ [UNIT] Error updating pet weight:", error);
      res.status(500).json({ error: "Erro ao atualizar peso do pet" });
    }
  });

  // ===== VETERINARIANS MANAGEMENT =====
  
  // Unified login endpoint - tries both unit and veterinarian/admin authentication
  app.post("/api/unified-auth/login", async (req: Request, res: Response) => {
    try {
      const { slug, login, password } = req.body;
      
      if (!slug || !login || !password) {
        return res.status(400).json({ error: "Dados incompletos" });
      }
      
      // ✅ SECURITY FIX: Enforce SESSION_SECRET without fallback
      if (!process.env.SESSION_SECRET) {
        console.error('❌ [SECURITY] SESSION_SECRET not configured for JWT');
        return res.status(500).json({ error: 'Configuração de segurança ausente' });
      }
      
      // First, try unit authentication
      const unit = await storage.getNetworkUnitBySlug(slug);
      if (!unit) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }
      
      // Check if it's the unit login
      if (unit.login === login) {
        // Verify unit password
        const isValidUnitPassword = await bcrypt.compare(password, unit.senhaHash || '');
        
        if (isValidUnitPassword) {
          // Generate JWT token for unit
          const token = jwt.sign(
            { unitId: unit.id, slug: unit.urlSlug },
            process.env.SESSION_SECRET,
            { expiresIn: '8h' }
          );
          
          console.log(`✅ [UNIFIED-AUTH] Unit logged in: ${unit.name}`);
          return res.json({ 
            token, 
            unitName: unit.name,
            userType: 'unit',
            redirectPath: `/unidade/${slug}/painel`
          });
        }
      }
      
      // If unit auth failed, try veterinarian/admin authentication
      const veterinarian = await storage.getVeterinarianByLogin(login);
      if (veterinarian) {
        // Check if veterinarian is active
        if (!veterinarian.isActive) {
          return res.status(401).json({ error: "Usuário inativo" });
        }
        
        // Check if has access to atendimentos
        if (!veterinarian.canAccessAtendimentos) {
          return res.status(401).json({ error: "Acesso não autorizado" });
        }
        
        // Verify password
        if (!veterinarian.passwordHash) {
          return res.status(401).json({ error: "Credenciais não configuradas" });
        }
        
        const isValidVetPassword = await bcrypt.compare(password, veterinarian.passwordHash);
        
        if (isValidVetPassword) {
          // Validate that the veterinarian belongs to the requested unit
          if (veterinarian.networkUnitId !== unit.id) {
            console.log(`⚠️ [UNIFIED-AUTH] User ${veterinarian.name} (unit: ${veterinarian.networkUnitId}) tried to login through unit ${unit.id}`);
            return res.status(403).json({ error: "Você não tem permissão para acessar esta unidade" });
          }
          
          // Generate JWT token for veterinarian/admin
          const token = jwt.sign(
            { 
              veterinarianId: veterinarian.id,
              unitId: veterinarian.networkUnitId,
              slug: unit.urlSlug,
              type: 'veterinarian',
              isAdmin: veterinarian.isAdmin || false
            },
            process.env.SESSION_SECRET,
            { expiresIn: '8h' }
          );
          
          // Determine redirect path based on user type
          const redirectPath = veterinarian.isAdmin 
            ? `/unidade/${unit.urlSlug}/painel` // Admins go to dashboard
            : `/unidade/${unit.urlSlug}/atendimentos/novo`; // Veterinarians go to atendimentos
          
          console.log(`✅ [UNIFIED-AUTH] ${veterinarian.isAdmin ? 'Admin' : 'Veterinarian'} logged in: ${veterinarian.name}`);
          return res.json({ 
            token, 
            veterinarianName: veterinarian.name,
            unitName: unit.name,
            unitSlug: unit.urlSlug,
            userType: veterinarian.isAdmin ? 'admin' : 'veterinarian',
            redirectPath
          });
        }
      }
      
      // If both authentications failed
      return res.status(401).json({ error: "Credenciais inválidas" });
      
    } catch (error) {
      console.error("❌ [UNIFIED-AUTH] Login error:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  // Veterinarian login
  app.post("/api/veterinarian-auth/login", async (req: Request, res: Response) => {
    try {
      const { login, password, slug } = req.body;
      
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
      
      // Get unit info
      const unit = await storage.getNetworkUnitById(veterinarian.networkUnitId);
      if (!unit) {
        return res.status(500).json({ error: "Erro ao buscar informações da unidade" });
      }
      
      // IMPORTANT: If slug is provided, validate that the veterinarian belongs to this specific unit
      if (slug) {
        const requestedUnit = await storage.getNetworkUnitBySlug(slug);
        if (!requestedUnit) {
          return res.status(404).json({ error: "Unidade não encontrada" });
        }
        
        // Validate that the veterinarian belongs to the requested unit
        if (veterinarian.networkUnitId !== requestedUnit.id) {
          console.log(`⚠️ [VET-AUTH] Veterinarian ${veterinarian.name} (unit: ${veterinarian.networkUnitId}) tried to login through unit ${requestedUnit.id}`);
          return res.status(403).json({ error: "Você não tem permissão para acessar esta unidade" });
        }
      }
      
      // ✅ SECURITY FIX: Enforce SESSION_SECRET without fallback
      if (!process.env.SESSION_SECRET) {
        console.error('❌ [SECURITY] SESSION_SECRET not configured for JWT');
        return res.status(500).json({ error: 'Configuração de segurança ausente' });
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
      
      const { name, crmv, email, phone, specialty, type, login, password, canAccessAtendimentos, isAdmin } = req.body;
      
      // Validate required fields
      if (!name || !email || !phone || !type) {
        return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });
      }
      
      // Hash password if provided
      let passwordHash: string | null = null;
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
        isAdmin: isAdmin || false,
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
      
      const { name, crmv, email, phone, specialty, type, login, password, canAccessAtendimentos, isAdmin, isActive } = req.body;
      
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (crmv !== undefined) updateData.crmv = crmv;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (specialty !== undefined) updateData.specialty = specialty;
      if (type !== undefined) updateData.type = type;
      if (login !== undefined) updateData.login = login;
      if (canAccessAtendimentos !== undefined) updateData.canAccessAtendimentos = canAccessAtendimentos;
      if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
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

  // Create action log (authenticated)
  app.post("/api/units/:slug/logs", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      const userType = req.unit?.type || 'unit';
      const veterinarianId = req.unit?.veterinarianId;
      const { actionType, actionData } = req.body;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }

      if (!actionType) {
        return res.status(400).json({ error: "actionType é obrigatório" });
      }
      
      // Create log entry
      const logData: any = {
        networkUnitId: unitId,
        userType: userType,
        actionType: actionType,
        actionData: actionData || null,
      };

      // If user is a veterinarian, include veterinarianId
      if (userType === 'veterinarian' && veterinarianId) {
        logData.veterinarianId = veterinarianId;
      }
      
      const log = await storage.createActionLog(logData);
      
      console.log(`✅ [UNIT] Action log created: ${actionType} by ${userType}`);
      res.status(201).json(log);
    } catch (error) {
      console.error("❌ [UNIT] Error creating action log:", error);
      res.status(500).json({ error: "Erro ao criar log de ação" });
    }
  });

  // Get action logs for unit (authenticated) with pagination and filters
  app.get("/api/units/:slug/logs", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      
      // Get all logs for this unit
      const allLogs = await storage.getActionLogsByUnit(unitId);
      
      // Apply filters
      let filteredLogs = [...allLogs];
      
      // Filter by user type if specified
      const { userType, startDate, endDate, page = '1', limit = '10' } = req.query;
      
      if (userType && userType !== 'all') {
        filteredLogs = filteredLogs.filter((log: any) => log.log.userType === userType);
      }
      
      // Filter by date range
      if (startDate || endDate) {
        filteredLogs = filteredLogs.filter((log: any) => {
          const logDate = new Date(log.log.createdAt);
          
          if (startDate) {
            const start = new Date(startDate as string);
            start.setHours(0, 0, 0, 0);
            if (logDate < start) return false;
          }
          
          if (endDate) {
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            if (logDate > end) return false;
          }
          
          return true;
        });
      }
      
      // Pagination
      const currentPage = parseInt(page as string, 10);
      const pageSize = parseInt(limit as string, 10);
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      
      const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
      const totalPages = Math.ceil(filteredLogs.length / pageSize);
      
      console.log(`✅ [UNIT] Retrieved ${paginatedLogs.length} of ${filteredLogs.length} action logs for unit ${unitId}`);
      
      res.json({
        data: paginatedLogs,
        total: filteredLogs.length,
        totalPages,
        page: currentPage
      });
    } catch (error) {
      console.error("❌ [UNIT] Error fetching action logs:", error);
      res.status(500).json({ error: "Erro ao buscar logs de ação" });
    }
  });

  // Chart endpoint: Get procedures sold count (authenticated)
  app.get("/api/units/:slug/charts/procedures-sold", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }

      // Build conditions based on user type
      const conditions: any[] = [eq(atendimentos.createdByUnitId, unitId)];
      
      // If it's a veterinarian, filter by their ID
      if (req.unit?.type === 'veterinarian' && req.unit?.veterinarianId) {
        conditions.push(eq(atendimentos.veterinarianId, req.unit.veterinarianId));
      }

      // Add date range filters if provided
      const { startDate, endDate } = req.query;
      
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        conditions.push(sql`${atendimentos.createdAt} >= ${start.toISOString()}`);
      }
      
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(sql`${atendimentos.createdAt} <= ${end.toISOString()}`);
      }

      // Get all atendimentos for this unit
      const unitAtendimentos = await db
        .select({ id: atendimentos.id })
        .from(atendimentos)
        .where(and(...conditions));

      const atendimentoIds = unitAtendimentos.map(a => a.id);

      if (atendimentoIds.length === 0) {
        return res.json([]);
      }

      // Get procedures count grouped by procedure name
      const proceduresCount = await db
        .select({
          name: atendimentoProcedures.procedureName,
          count: sql<number>`count(*)::int`
        })
        .from(atendimentoProcedures)
        .where(inArray(atendimentoProcedures.atendimentoId, atendimentoIds))
        .groupBy(atendimentoProcedures.procedureName)
        .orderBy(sql`count(*) DESC`)
        .limit(10);

      console.log(`✅ [UNIT] Retrieved procedures sold chart data for unit ${unitId}`);
      res.json(proceduresCount);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching procedures sold chart:", error);
      res.status(500).json({ error: "Erro ao buscar dados do gráfico" });
    }
  });

  // Chart endpoint: Get value by user who created atendimentos (authenticated)
  app.get("/api/units/:slug/charts/value-by-user", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }

      // Build conditions based on user type
      const conditions: any[] = [eq(atendimentos.createdByUnitId, unitId)];
      
      // If it's a veterinarian, filter by their ID
      if (req.unit?.type === 'veterinarian' && req.unit?.veterinarianId) {
        conditions.push(eq(atendimentos.veterinarianId, req.unit.veterinarianId));
      }

      // Add date range filters if provided
      const { startDate, endDate } = req.query;
      
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        conditions.push(sql`${atendimentos.createdAt} >= ${start.toISOString()}`);
      }
      
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(sql`${atendimentos.createdAt} <= ${end.toISOString()}`);
      }

      // Get value grouped by veterinarian from atendimento_procedures
      const valuesByVet = await db
        .select({
          veterinarianId: atendimentos.veterinarianId,
          totalValue: sql<string>`COALESCE(SUM(CAST(${atendimentoProcedures.value} AS NUMERIC)), 0)`
        })
        .from(atendimentos)
        .leftJoin(atendimentoProcedures, eq(atendimentos.id, atendimentoProcedures.atendimentoId))
        .where(and(...conditions))
        .groupBy(atendimentos.veterinarianId);

      // Get veterinarian names
      const vetIds = valuesByVet
        .filter(v => v.veterinarianId)
        .map(v => v.veterinarianId!);

      const vetsData = vetIds.length > 0 
        ? await db.select({ id: veterinarians.id, name: veterinarians.name })
            .from(veterinarians)
            .where(inArray(veterinarians.id, vetIds))
        : [];

      const vetMap = new Map(vetsData.map(v => [v.id, v.name]));

      // Format response
      const chartData = valuesByVet.map(v => ({
        name: v.veterinarianId ? (vetMap.get(v.veterinarianId) || 'Veterinário Desconhecido') : 'Unidade',
        value: parseFloat(v.totalValue || '0')
      })).filter(d => d.value > 0);

      console.log(`✅ [UNIT] Retrieved value by user chart data for unit ${unitId}`);
      res.json(chartData);
    } catch (error) {
      console.error("❌ [UNIT] Error fetching value by user chart:", error);
      res.status(500).json({ error: "Erro ao buscar dados do gráfico" });
    }
  });

  // Chart endpoint: Get total sales value (authenticated)
  app.get("/api/units/:slug/charts/total-sales", requireUnitAuth, async (req: UnitRequest, res: Response) => {
    try {
      const unitId = req.unit?.unitId;
      
      if (!unitId) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }

      // Build conditions based on user type
      const conditions: any[] = [eq(atendimentos.createdByUnitId, unitId)];
      
      // If it's a veterinarian, filter by their ID
      if (req.unit?.type === 'veterinarian' && req.unit?.veterinarianId) {
        conditions.push(eq(atendimentos.veterinarianId, req.unit.veterinarianId));
      }

      // Add date range filters if provided
      const { startDate, endDate } = req.query;
      
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        conditions.push(sql`${atendimentos.createdAt} >= ${start.toISOString()}`);
      }
      
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(sql`${atendimentos.createdAt} <= ${end.toISOString()}`);
      }

      // Get total sales value from atendimento_procedures
      const totalSalesResult = await db
        .select({
          totalValue: sql<string>`COALESCE(SUM(CAST(${atendimentoProcedures.value} AS NUMERIC)), 0)`,
          count: sql<number>`COUNT(DISTINCT ${atendimentos.id})::int`
        })
        .from(atendimentos)
        .leftJoin(atendimentoProcedures, eq(atendimentos.id, atendimentoProcedures.atendimentoId))
        .where(and(...conditions));

      const totalValue = parseFloat(totalSalesResult[0]?.totalValue || '0');
      const totalCount = totalSalesResult[0]?.count || 0;

      console.log(`✅ [UNIT] Retrieved total sales chart data for unit ${unitId}`);
      res.json({
        totalValue,
        totalCount,
        averageValue: totalCount > 0 ? totalValue / totalCount : 0
      });
    } catch (error) {
      console.error("❌ [UNIT] Error fetching total sales chart:", error);
      res.status(500).json({ error: "Erro ao buscar dados do gráfico" });
    }
  });
}