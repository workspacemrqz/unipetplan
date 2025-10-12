import * as crypto from 'crypto';
import {
  type ContactSubmission,
  type InsertContactSubmission,
  type Plan,
  type InsertPlan,
  type NetworkUnit,
  type InsertNetworkUnit,
  type FaqItem,
  type InsertFaqItem,
  type SiteSettings,
  type InsertSiteSettings,
  type ChatSettings,
  type InsertChatSettings,
  type Client,
  type InsertClient,
  type Seller,
  type InsertSeller,
  type Species,
  type InsertSpecies,
  type Pet,
  type InsertPet,
  type Contract,
  type InsertContract,
  type Procedure,
  type InsertProcedure,
  type PlanProcedure,
  type InsertPlanProcedure,
  type ServiceHistory,
  type InsertServiceHistory,
  type Protocol,
  type InsertProtocol,
  type Guide,
  type InsertGuide,
  type SatisfactionSurvey,
  type InsertSatisfactionSurvey,
  contactSubmissions,
  plans,
  networkUnits,
  faqItems,
  siteSettings,
  chatSettings,
  clients,
  sellers,
  sellerAnalytics,
  sellerPayments,
  species,
  pets,
  contracts,
  procedures,
  planProcedures,
  serviceHistory,
  protocols,
  guides,
  satisfactionSurveys,
  paymentReceipts,
  users,
  rulesSettings,
  coupons,
  contractInstallments,
  procedureUsage,
  procedureCategories
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import { autoConfig } from "./config.js";

export interface IStorage {
  // Contact Submissions
  createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission>;
  getContactSubmissions(): Promise<ContactSubmission[]>;
  getAllContactSubmissions(): Promise<ContactSubmission[]>;
  deleteContactSubmission(id: string): Promise<boolean>;

  // Plans
  getPlans(): Promise<Plan[]>;
  getAllPlans(): Promise<Plan[]>;
  getAllActivePlans(): Promise<Plan[]>; // For public API
  getPlan(id: string): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: string, plan: Partial<InsertPlan>): Promise<Plan | undefined>;

  deletePlan(id: string): Promise<boolean>;

  // Network Units
  getNetworkUnits(): Promise<NetworkUnit[]>;
  getAllNetworkUnits(): Promise<NetworkUnit[]>;
  getAllActiveNetworkUnits(): Promise<NetworkUnit[]>; // For public API
  getNetworkUnit(id: string): Promise<NetworkUnit | undefined>;
  createNetworkUnit(unit: InsertNetworkUnit): Promise<NetworkUnit>;
  updateNetworkUnit(id: string, unit: Partial<InsertNetworkUnit>): Promise<NetworkUnit | undefined>;
  deleteNetworkUnit(id: string): Promise<boolean>;

  // FAQ Items
  getFaqItems(): Promise<FaqItem[]>;
  getAllFaqItems(): Promise<FaqItem[]>;
  getFaqItem(id: string): Promise<FaqItem | undefined>;
  createFaqItem(item: InsertFaqItem): Promise<FaqItem>;
  updateFaqItem(id: string, item: Partial<InsertFaqItem>): Promise<FaqItem | undefined>;
  deleteFaqItem(id: string): Promise<boolean>;

  // Site Settings
  getSiteSettings(): Promise<SiteSettings | undefined>;
  updateSiteSettings(settings: Partial<InsertSiteSettings>): Promise<SiteSettings | undefined>;

  // Chat Settings
  getChatSettings(): Promise<ChatSettings | undefined>;
  updateChatSettings(settings: Partial<InsertChatSettings>): Promise<ChatSettings | undefined>;
  createDefaultChatSettings(): Promise<ChatSettings>;

  // Clients
  getClientByEmail(email: string): Promise<Client | undefined>;
  getClientById(id: string): Promise<Client | undefined>;
  getClientByCpf(cpf: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  getAllClients(): Promise<Client[]>;

  // Sellers
  getSellerByEmail(email: string): Promise<Seller | undefined>;
  getSellerById(id: string): Promise<Seller | undefined>;
  getSellerByWhitelabelUrl(whitelabelUrl: string): Promise<Seller | undefined>;
  createSeller(seller: InsertSeller): Promise<Seller>;
  updateSeller(id: string, seller: Partial<InsertSeller>): Promise<Seller | undefined>;
  deleteSeller(id: string): Promise<boolean>;
  getAllSellers(): Promise<Seller[]>;
  
  // Seller Analytics
  trackSellerClick(sellerId: string): Promise<void>;
  trackSellerConversion(sellerId: string, revenue?: number): Promise<void>;
  getSellerAnalytics(sellerId: string): Promise<{clicks: number, conversions: number, conversionRate: number}>;

  // Seller Payments
  getSellerPayments(sellerId: string): Promise<any[]>;
  createSellerPayment(payment: {sellerId: string; amount: number; paymentDate: Date; description: string | null; createdBy: string}): Promise<any>;
  getSellerSalesReport(sellerId: string): Promise<any>;

  // === NEW TABLE METHODS ===

  // Pets
  createPet(pet: InsertPet): Promise<Pet>;
  updatePet(id: string, pet: Partial<InsertPet>): Promise<Pet | undefined>;
  getPet(id: string): Promise<Pet | undefined>;
  getPetsByClientId(clientId: string): Promise<Pet[]>;
  deletePet(id: string): Promise<boolean>;
  getAllPets(): Promise<Pet[]>;

  // Contracts
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  getContract(id: string): Promise<Contract | undefined>;
  getContractsByClientId(clientId: string): Promise<Contract[]>;
  getContractsByPetId(petId: string): Promise<Contract[]>;
  getContractByCieloPaymentId(cieloPaymentId: string): Promise<Contract | undefined>;
  deleteContract(id: string): Promise<boolean>;
  getAllContracts(): Promise<Contract[]>;

  // Procedures
  createProcedure(procedure: InsertProcedure): Promise<Procedure>;
  updateProcedure(id: string, procedure: Partial<InsertProcedure>): Promise<Procedure | undefined>;
  getProcedure(id: string): Promise<Procedure | undefined>;
  getAllProcedures(): Promise<Procedure[]>;
  getActiveProcedures(): Promise<Procedure[]>;
  getProceduresWithCoparticipation(planId?: string): Promise<any[]>;
  deleteProcedure(id: string): Promise<boolean>;
  getProcedureCategories(): Promise<any[]>;

  // Plan Procedures
  createPlanProcedure(planProcedure: InsertPlanProcedure): Promise<PlanProcedure>;
  getPlanProcedures(planId: string): Promise<PlanProcedure[]>;
  deletePlanProcedure(planId: string, procedureId: string): Promise<boolean>;
  getAllPlanProcedures(): Promise<PlanProcedure[]>;

  // Service History
  createServiceHistory(serviceHistory: InsertServiceHistory): Promise<ServiceHistory>;
  updateServiceHistory(id: string, serviceHistory: Partial<InsertServiceHistory>): Promise<ServiceHistory | undefined>;
  getServiceHistory(id: string): Promise<ServiceHistory | undefined>;
  getServiceHistoryByContractId(contractId: string): Promise<ServiceHistory[]>;
  getServiceHistoryByPetId(petId: string): Promise<ServiceHistory[]>;
  getAllServiceHistory(): Promise<ServiceHistory[]>;

  // Protocols
  createProtocol(protocol: InsertProtocol): Promise<Protocol>;
  updateProtocol(id: string, protocol: Partial<InsertProtocol>): Promise<Protocol | undefined>;
  getProtocol(id: string): Promise<Protocol | undefined>;
  getProtocolsByClientId(clientId: string): Promise<Protocol[]>;
  getAllProtocols(): Promise<Protocol[]>;
  deleteProtocol(id: string): Promise<boolean>;

  // Guides
  createGuide(guide: InsertGuide): Promise<Guide>;
  updateGuide(id: string, guide: Partial<InsertGuide>): Promise<Guide | undefined>;
  getGuide(id: string): Promise<Guide | undefined>;
  getAllGuides(): Promise<Guide[]>;
  getActiveGuides(): Promise<Guide[]>;
  deleteGuide(id: string): Promise<boolean>;

  // Satisfaction Surveys
  createSatisfactionSurvey(survey: InsertSatisfactionSurvey): Promise<SatisfactionSurvey>;
  getSatisfactionSurvey(id: string): Promise<SatisfactionSurvey | undefined>;
  getSatisfactionSurveysByClientId(clientId: string): Promise<SatisfactionSurvey[]>;
  getAllSatisfactionSurveys(): Promise<SatisfactionSurvey[]>;

  // Species
  getSpecies(): Promise<Species[]>;
  getAllSpecies(): Promise<Species[]>;
  getActiveSpecies(): Promise<Species[]>;
  createSpecies(species: InsertSpecies): Promise<Species>;
  updateSpecies(id: string, species: Partial<InsertSpecies>): Promise<Species | undefined>;
  deleteSpecies(id: string): Promise<boolean>;


  // Payment receipt methods
  createPaymentReceipt(receipt: any): Promise<any>;
  getPaymentReceiptByCieloPaymentId(cieloPaymentId: string): Promise<any | undefined>;
  getPaymentReceiptById(id: string): Promise<any | undefined>;
  getPaymentReceiptsByClientEmail(clientEmail: string): Promise<any[]>;
  getPaymentReceiptsByContractId(contractId: string): Promise<any[]>;
  updatePaymentReceiptStatus(id: string, status: 'generated' | 'downloaded' | 'sent'): Promise<any | undefined>;

  // Additional methods required by routes
  getProcedureUsageByClient(clientId: string, year: number): Promise<any[]>;
  getPlanProceduresWithDetails(planId: string): Promise<any[]>;
  getProcedureUsageByPet(petId: string, year: number): Promise<any[]>;
  incrementProcedureUsage(petId: string, procedureId: string, planId: string): Promise<any>;
  getUserByEmail(email: string): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  getAllPaymentReceipts(): Promise<any[]>;
  getRulesSettings(): Promise<any | undefined>;
  updateRulesSettings(settings: any): Promise<any | undefined>;
  getProcedurePlans(procedureId: string): Promise<any[]>;
  updateProcedurePlans(procedureId: string, plans: any[]): Promise<void>;
  getAllUsers(): Promise<any[]>;
  createUser(user: any): Promise<any>;
  updateUser(id: string, user: any): Promise<any | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllCoupons(): Promise<any[]>;
  getCouponById(id: string): Promise<any | undefined>;
  createCoupon(coupon: any): Promise<any>;
  updateCoupon(id: string, coupon: any): Promise<any | undefined>;
  deleteCoupon(id: string): Promise<boolean>;
  validateCoupon(code: string, amount?: number): Promise<{ valid: boolean; discount?: number; message?: string; coupon?: any }>;
  getNetworkUnitBySlug(slug: string): Promise<NetworkUnit | undefined>;
  incrementCouponUsage(couponId: string): Promise<void>;
  createContractInstallment(installment: any): Promise<any>;
  updateContractInstallment(id: string, installment: any): Promise<any | undefined>;
  getContractInstallmentsByContractId(contractId: string): Promise<any[]>;
  getContractInstallmentById(id: string): Promise<any | undefined>;
  getGuidesWithNetworkUnits(filters: any): Promise<any>;
  getContractInstallmentByCieloPaymentId(cieloPaymentId: string): Promise<any | undefined>;

  // Chat Conversations - Removed (table no longer exists)
}

// Storage em memória para quando não houver banco de dados
export class InMemoryStorage implements IStorage {
  private contactSubmissions: ContactSubmission[] = [];
  private plans: Plan[] = [];
  private networkUnits: NetworkUnit[] = [];
  private faqItems: FaqItem[] = [];
  private siteSettings: SiteSettings | undefined;
  private chatSettings: ChatSettings | undefined;
  private clients: Client[] = [];

  constructor() {
    // Sample data for development
  }

  async createContactSubmission(insertSubmission: InsertContactSubmission): Promise<ContactSubmission> { return insertSubmission as any; }
  async getContactSubmissions(): Promise<ContactSubmission[]> { return []; }
  async getAllContactSubmissions(): Promise<ContactSubmission[]> { return []; }
  async deleteContactSubmission(id: string): Promise<boolean> { return true; }
  async getPlans(): Promise<Plan[]> { return []; }
  async getAllPlans(): Promise<Plan[]> { return []; }
  async getAllActivePlans(): Promise<Plan[]> { return []; }
  async getPlan(id: string): Promise<Plan | undefined> { return undefined; }
  async createPlan(insertPlan: InsertPlan): Promise<Plan> { return insertPlan as any; }
  async updatePlan(id: string, updateData: Partial<InsertPlan>): Promise<Plan | undefined> { return undefined; }
  async deletePlan(id: string): Promise<boolean> { return true; }
  async getNetworkUnits(): Promise<NetworkUnit[]> { return []; }
  async getAllNetworkUnits(): Promise<NetworkUnit[]> { return []; }
  async getAllActiveNetworkUnits(): Promise<NetworkUnit[]> { return []; }
  async getNetworkUnit(id: string): Promise<NetworkUnit | undefined> { return undefined; }
  async createNetworkUnit(insertUnit: InsertNetworkUnit): Promise<NetworkUnit> { return insertUnit as any; }
  async updateNetworkUnit(id: string, updateData: Partial<InsertNetworkUnit>): Promise<NetworkUnit | undefined> { return undefined; }
  async deleteNetworkUnit(id: string): Promise<boolean> { return true; }
  async getFaqItems(): Promise<FaqItem[]> { return []; }
  async getAllFaqItems(): Promise<FaqItem[]> { return []; }
  async getFaqItem(id: string): Promise<FaqItem | undefined> { return undefined; }
  async createFaqItem(insertItem: InsertFaqItem): Promise<FaqItem> { return insertItem as any; }
  async updateFaqItem(id: string, updateData: Partial<InsertFaqItem>): Promise<FaqItem | undefined> { return undefined; }
  async deleteFaqItem(id: string): Promise<boolean> { return true; }
  async getSiteSettings(): Promise<SiteSettings | undefined> { return undefined; }
  async updateSiteSettings(updateData: Partial<InsertSiteSettings>): Promise<SiteSettings | undefined> { return undefined; }
  async getChatSettings(): Promise<ChatSettings | undefined> { return undefined; }
  async updateChatSettings(updateData: Partial<InsertChatSettings>): Promise<ChatSettings | undefined> { return undefined; }
  async createDefaultChatSettings(): Promise<ChatSettings> {
    return {
      id: crypto.randomUUID(),
      welcomeMessage: 'Olá! Como posso te ajudar hoje?',
      placeholderText: 'Digite sua mensagem...',
      chatTitle: 'Atendimento Virtual',
      buttonIcon: 'MessageCircle',
      botIcon: null,
      userIcon: null,
      botIconUrl: null,
      userIconUrl: null,
      chatPosition: 'bottom-right',
      chatSize: 'md',
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ChatSettings;
  }
  async getClientByEmail(email: string): Promise<Client | undefined> { return undefined; }
  async getClientById(id: string): Promise<Client | undefined> { return undefined; }
  async getClientByCpf(cpf: string): Promise<Client | undefined> { return undefined; }
  async createClient(client: InsertClient): Promise<Client> { return client as any; }
  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> { return undefined; }
  async deleteClient(id: string): Promise<boolean> { return true; }
  async getAllClients(): Promise<Client[]> { return []; }
  async getSellerByEmail(email: string): Promise<Seller | undefined> { return undefined; }
  async getSellerById(id: string): Promise<Seller | undefined> { return undefined; }
  async getSellerByWhitelabelUrl(whitelabelUrl: string): Promise<Seller | undefined> { return undefined; }
  async createSeller(seller: InsertSeller): Promise<Seller> { return seller as any; }
  async updateSeller(id: string, seller: Partial<InsertSeller>): Promise<Seller | undefined> { return undefined; }
  async deleteSeller(id: string): Promise<boolean> { return true; }
  async getAllSellers(): Promise<Seller[]> { return []; }
  async trackSellerClick(sellerId: string): Promise<void> {}
  async trackSellerConversion(sellerId: string, revenue?: number): Promise<void> {}
  async getSellerAnalytics(sellerId: string): Promise<{clicks: number, conversions: number, conversionRate: number}> {
    return { clicks: 0, conversions: 0, conversionRate: 0 };
  }
  async getSellerPayments(sellerId: string): Promise<any[]> { return []; }
  async createSellerPayment(payment: {sellerId: string; amount: number; paymentDate: Date; description: string | null; createdBy: string}): Promise<any> { return payment as any; }
  async getSellerSalesReport(sellerId: string): Promise<any> { 
    return {
      totalSales: 0,
      totalRevenue: 0,
      totalCpaCommission: 0,
      totalRecurringCommission: 0,
      totalCommission: 0,
      totalPaid: 0,
      balance: 0
    };
  }
  async createPet(pet: InsertPet): Promise<Pet> { return pet as any; }
  async updatePet(id: string, pet: Partial<InsertPet>): Promise<Pet | undefined> { return undefined; }
  async getPet(id: string): Promise<Pet | undefined> { return undefined; }
  async getPetsByClientId(clientId: string): Promise<Pet[]> { return []; }
  async deletePet(id: string): Promise<boolean> { return true; }
  async getAllPets(): Promise<Pet[]> { return []; }
  async createContract(contract: InsertContract): Promise<Contract> { return contract as any; }
  async updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined> { return undefined; }
  async getContract(id: string): Promise<Contract | undefined> { return undefined; }
  async getContractsByClientId(clientId: string): Promise<Contract[]> { return []; }
  async getContractsByPetId(petId: string): Promise<Contract[]> { return []; }
  async getContractByCieloPaymentId(cieloPaymentId: string): Promise<Contract | undefined> { return undefined; }
  async deleteContract(id: string): Promise<boolean> { return true; }
  async getAllContracts(): Promise<Contract[]> { return []; }
  async getAllInstallments() { return []; }
  async createProcedure(procedure: InsertProcedure): Promise<Procedure> { return procedure as any; }
  async updateProcedure(id: string, procedure: Partial<InsertProcedure>): Promise<Procedure | undefined> { return undefined; }
  async getProcedure(id: string): Promise<Procedure | undefined> { return undefined; }
  async getAllProcedures(): Promise<Procedure[]> { return []; }
  async getActiveProcedures(): Promise<any[]> { return []; }
  async getProceduresWithCoparticipation(planId?: string): Promise<any[]> { return []; }
  async deleteProcedure(id: string): Promise<boolean> { return true; }
  async getProcedureCategories(): Promise<any[]> { return []; }
  async createPlanProcedure(planProcedure: InsertPlanProcedure): Promise<PlanProcedure> { return planProcedure as any; }
  async getPlanProcedures(planId: string): Promise<PlanProcedure[]> { return []; }
  async deletePlanProcedure(planId: string, procedureId: string): Promise<boolean> { return true; }
  async getAllPlanProcedures(): Promise<PlanProcedure[]> { return []; }
  async createServiceHistory(serviceHistoryData: InsertServiceHistory): Promise<ServiceHistory> { return serviceHistoryData as any; }
  async updateServiceHistory(id: string, serviceHistoryData: Partial<InsertServiceHistory>): Promise<ServiceHistory | undefined> { return undefined; }
  async getServiceHistory(id: string): Promise<ServiceHistory | undefined> { return undefined; }
  async getServiceHistoryByContractId(contractId: string): Promise<ServiceHistory[]> { return []; }
  async getServiceHistoryByPetId(petId: string): Promise<ServiceHistory[]> { return []; }
  async getAllServiceHistory(): Promise<ServiceHistory[]> { return []; }
  async createProtocol(protocol: InsertProtocol): Promise<Protocol> { return protocol as any; }
  async updateProtocol(id: string, protocol: Partial<InsertProtocol>): Promise<Protocol | undefined> { return undefined; }
  async getProtocol(id: string): Promise<Protocol | undefined> { return undefined; }
  async getProtocolsByClientId(clientId: string): Promise<Protocol[]> { return []; }
  async getAllProtocols(): Promise<Protocol[]> { return []; }
  async deleteProtocol(id: string): Promise<boolean> { return true; }
  async createGuide(guide: InsertGuide): Promise<Guide> { return guide as any; }
  async updateGuide(id: string, guide: Partial<InsertGuide>): Promise<Guide | undefined> { return undefined; }
  async getGuide(id: string): Promise<Guide | undefined> { return undefined; }
  async getAllGuides(): Promise<Guide[]> { return []; }
  async getActiveGuides(): Promise<Guide[]> { return []; }
  async deleteGuide(id: string): Promise<boolean> { return true; }
  async createSatisfactionSurvey(survey: InsertSatisfactionSurvey): Promise<SatisfactionSurvey> { return survey as any; }
  async getSatisfactionSurvey(id: string): Promise<SatisfactionSurvey | undefined> { return undefined; }
  async getSatisfactionSurveysByClientId(clientId: string): Promise<SatisfactionSurvey[]> { return []; }
  async getAllSatisfactionSurveys(): Promise<SatisfactionSurvey[]> { return []; }
  async getSpecies(): Promise<Species[]> { return []; }
  async getAllSpecies(): Promise<Species[]> { return []; }
  async getActiveSpecies(): Promise<Species[]> { return []; }
  async createSpecies(speciesData: InsertSpecies): Promise<Species> { return speciesData as any; }
  async updateSpecies(id: string, speciesData: Partial<InsertSpecies>): Promise<Species | undefined> { return undefined; }
  async deleteSpecies(id: string): Promise<boolean> { return true; }
  async createPaymentReceipt(receipt: any): Promise<any> { return receipt; }
  async getPaymentReceiptById(id: string): Promise<any | undefined> { return undefined; }
  async getPaymentReceiptsByClientEmail(clientEmail: string): Promise<any[]> { return []; }
  async getPaymentReceiptsByContractId(contractId: string): Promise<any[]> { return []; }
  async updatePaymentReceiptStatus(id: string, status: 'generated' | 'downloaded' | 'sent'): Promise<any | undefined> { return undefined; }
  async getPaymentReceiptByCieloPaymentId(cieloPaymentId: string): Promise<any | undefined> { return undefined; }

  // Chat Conversations methods - Removed (table no longer exists)

  // Additional stub methods required by routes
  async getProcedureUsageByClient(clientId: string, year: number): Promise<any[]> { return []; }
  async getPlanProceduresWithDetails(planId: string): Promise<any[]> { return []; }
  async getProcedureUsageByPet(petId: string, year: number): Promise<any[]> { return []; }
  async incrementProcedureUsage(petId: string, procedureId: string, planId: string): Promise<any> { return { petId, procedureId, year: 2024, usageCount: 1 }; }
  async getUserByEmail(email: string): Promise<any | undefined> { return undefined; }
  async getUserByUsername(username: string): Promise<any | undefined> { return undefined; }
  async getAllPaymentReceipts(): Promise<any[]> { return []; }
  async getRulesSettings(): Promise<any | undefined> { return undefined; }
  async updateRulesSettings(settings: any): Promise<any | undefined> { return settings; }
  async getProcedurePlans(procedureId: string): Promise<any[]> { return []; }
  async updateProcedurePlans(procedureId: string, plans: any[]): Promise<void> { }
  async getAllUsers(): Promise<any[]> { return []; }
  async createUser(user: any): Promise<any> { return user; }
  async updateUser(id: string, user: any): Promise<any | undefined> { return user; }
  async deleteUser(id: string): Promise<boolean> { return true; }
  async getAllCoupons(): Promise<any[]> { return []; }
  async getCouponById(id: string): Promise<any | undefined> { return undefined; }
  async createCoupon(coupon: any): Promise<any> { return coupon; }
  async updateCoupon(id: string, coupon: any): Promise<any | undefined> { return coupon; }
  async deleteCoupon(id: string): Promise<boolean> { return true; }
  async validateCoupon(code: string, amount?: number): Promise<{ valid: boolean; discount?: number; message?: string; coupon?: any }> { return { valid: false, message: 'Cupom inválido' }; }
  async getNetworkUnitBySlug(slug: string): Promise<NetworkUnit | undefined> { return this.networkUnits.find(u => u.urlSlug === slug); }
  async incrementCouponUsage(couponId: string): Promise<void> { }
  async createContractInstallment(installment: any): Promise<any> { return installment; }
  async updateContractInstallment(id: string, installment: any): Promise<any | undefined> { return installment; }
  async getContractInstallmentsByContractId(contractId: string): Promise<any[]> { return []; }
  async getContractInstallmentById(id: string): Promise<any | undefined> { return undefined; }
  async getGuidesWithNetworkUnits(filters: any): Promise<any> { return { guides: [], total: 0 }; }
  async getContractInstallmentByCieloPaymentId(cieloPaymentId: string): Promise<any | undefined> { return undefined; }
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Session management now uses MemoryStore via express-session
  }

  // Contact Submissions
  async createContactSubmission(insertSubmission: InsertContactSubmission): Promise<ContactSubmission> {
    const [submission] = await db.insert(contactSubmissions).values(insertSubmission as any).returning();
    return submission;
  }

  async getContactSubmissions(): Promise<ContactSubmission[]> {
    return await db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt));
  }

  async getAllContactSubmissions(): Promise<ContactSubmission[]> {
    return await db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt));
  }

  async deleteContactSubmission(id: string): Promise<boolean> {
    const result = await db.delete(contactSubmissions).where(eq(contactSubmissions.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Plans
  async getPlans(): Promise<Plan[]> {
    try {
      const result = await db.select({
        id: plans.id,
        name: plans.name,

        description: plans.description,
        features: plans.features,
        image: plans.image,
        buttonText: plans.buttonText,
        planType: plans.planType,
        isActive: plans.isActive,
        displayOrder: plans.displayOrder,
        createdAt: plans.createdAt,
        // ✅ Novas colunas para informações de pagamento
        billingFrequency: plans.billingFrequency,
        basePrice: plans.basePrice,
        installmentPrice: plans.installmentPrice,
        installmentCount: plans.installmentCount,
        perPetBilling: plans.perPetBilling,
        petDiscounts: plans.petDiscounts,
        paymentDescription: plans.paymentDescription,
        availablePaymentMethods: plans.availablePaymentMethods,
        availableBillingOptions: plans.availableBillingOptions,
        annualPrice: plans.annualPrice,
        annualInstallmentPrice: plans.annualInstallmentPrice,
        annualInstallmentCount: plans.annualInstallmentCount,
      }).from(plans).where(eq(plans.isActive, true)).orderBy(asc(plans.displayOrder));

      return result;
    } catch (error) {
      console.error("Error in getPlans:", error);
      throw error;
    }
  }

  async getAllPlans(): Promise<Plan[]> {
    try {
      const result = await db.select({
        id: plans.id,
        name: plans.name,

        description: plans.description,
        features: plans.features,
        image: plans.image,
        buttonText: plans.buttonText,
        planType: plans.planType,
        isActive: plans.isActive,
        displayOrder: plans.displayOrder,
        createdAt: plans.createdAt,
        // ✅ Novas colunas para informações de pagamento
        billingFrequency: plans.billingFrequency,
        basePrice: plans.basePrice,
        installmentPrice: plans.installmentPrice,
        installmentCount: plans.installmentCount,
        perPetBilling: plans.perPetBilling,
        petDiscounts: plans.petDiscounts,
        paymentDescription: plans.paymentDescription,
        availablePaymentMethods: plans.availablePaymentMethods,
        availableBillingOptions: plans.availableBillingOptions,
        annualPrice: plans.annualPrice,
        annualInstallmentPrice: plans.annualInstallmentPrice,
        annualInstallmentCount: plans.annualInstallmentCount,
      }).from(plans).orderBy(asc(plans.displayOrder));

      return result;
    } catch (error) {
      console.error("Error in getAllPlans:", error);
      throw error;
    }
  }

  async getAllActivePlans(): Promise<Plan[]> {
    return await db.select().from(plans).where(eq(plans.isActive, true)).orderBy(asc(plans.displayOrder));
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    try {
      const [plan] = await db.select({
        id: plans.id,
        name: plans.name,

        description: plans.description,
        features: plans.features,
        image: plans.image,
        buttonText: plans.buttonText,
        planType: plans.planType,
        isActive: plans.isActive,
        displayOrder: plans.displayOrder,
        createdAt: plans.createdAt,
        // ✅ Novas colunas para informações de pagamento
        billingFrequency: plans.billingFrequency,
        basePrice: plans.basePrice,
        installmentPrice: plans.installmentPrice,
        installmentCount: plans.installmentCount,
        perPetBilling: plans.perPetBilling,
        petDiscounts: plans.petDiscounts,
        paymentDescription: plans.paymentDescription,
        availablePaymentMethods: plans.availablePaymentMethods,
        availableBillingOptions: plans.availableBillingOptions,
        annualPrice: plans.annualPrice,
        annualInstallmentPrice: plans.annualInstallmentPrice,
        annualInstallmentCount: plans.annualInstallmentCount,
      }).from(plans).where(eq(plans.id, id));

      return plan || undefined;
    } catch (error) {
      console.error("Error in getPlan:", error);
      throw error;
    }
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const [plan] = await db.insert(plans).values(insertPlan as any).returning();
    return plan;
  }

  async updatePlan(id: string, updateData: Partial<InsertPlan>): Promise<Plan | undefined> {
    const [plan] = await db.update(plans).set(updateData).where(eq(plans.id, id)).returning();
    return plan || undefined;
  }



  async deletePlan(id: string): Promise<boolean> {
    const result = await db.delete(plans).where(eq(plans.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Network Units
  async getNetworkUnits(): Promise<NetworkUnit[]> {
    return await db.select().from(networkUnits).where(eq(networkUnits.isActive, true));
  }

  async getAllNetworkUnits(): Promise<NetworkUnit[]> {
    try {
      const results = await db.select().from(networkUnits);
      console.log(`✅ [STORAGE] Found ${results.length} network units`);

      // Debug log for the returned data
      results.forEach(unit => {
        console.log(`📸 [STORAGE] Unit ${unit.name}:`);
        console.log(`  - imageUrl (Base64):`, unit.imageUrl?.substring(0, 50) || 'null');
        console.log(`  - imageData:`, unit.imageData?.substring(0, 50) || 'null');
        console.log(`  - imageUrl starts with:`, unit.imageUrl?.substring(0, 10) || 'null');
        console.log(`  - imageUrl length:`, unit.imageUrl?.length || 0);
      });

      return results;
    } catch (error) {
      console.error("❌ [STORAGE] Error fetching network units:", error);
      throw error;
    }
  }

  async getAllActiveNetworkUnits(): Promise<NetworkUnit[]> {
    return await db.select().from(networkUnits).where(eq(networkUnits.isActive, true)).orderBy(desc(networkUnits.createdAt));
  }

  async getNetworkUnit(id: string): Promise<NetworkUnit | undefined> {
    const [unit] = await db.select().from(networkUnits).where(eq(networkUnits.id, id));
    return unit || undefined;
  }

  async createNetworkUnit(insertUnit: InsertNetworkUnit): Promise<NetworkUnit> {
    const [unit] = await db.insert(networkUnits).values(insertUnit as any).returning();
    return unit;
  }

  async updateNetworkUnit(id: string, updateData: Partial<InsertNetworkUnit>): Promise<NetworkUnit | undefined> {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('Update data cannot be empty');
    }
    const [unit] = await db.update(networkUnits).set(updateData).where(eq(networkUnits.id, id)).returning();
    return unit || undefined;
  }

  async deleteNetworkUnit(id: string): Promise<boolean> {
    const result = await db.delete(networkUnits).where(eq(networkUnits.id, id));
    return (result.rowCount || 0) > 0;
  }

  // FAQ Items
  async getFaqItems(): Promise<FaqItem[]> {
    return await db.select().from(faqItems).where(eq(faqItems.isActive, true)).orderBy(asc(faqItems.displayOrder));
  }

  async getAllFaqItems(): Promise<FaqItem[]> {
    return await db.select().from(faqItems).orderBy(asc(faqItems.displayOrder));
  }

  async getFaqItem(id: string): Promise<FaqItem | undefined> {
    const [item] = await db.select().from(faqItems).where(eq(faqItems.id, id));
    return item || undefined;
  }

  async createFaqItem(insertItem: InsertFaqItem): Promise<FaqItem> {
    const [item] = await db.insert(faqItems).values(insertItem as any).returning();
    return item;
  }

  async updateFaqItem(id: string, updateData: Partial<InsertFaqItem>): Promise<FaqItem | undefined> {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('Update data cannot be empty');
    }
    const [item] = await db.update(faqItems).set(updateData).where(eq(faqItems.id, id)).returning();
    return item || undefined;
  }

  async deleteFaqItem(id: string): Promise<boolean> {
    const result = await db.delete(faqItems).where(eq(faqItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Site Settings
  async getSiteSettings(): Promise<SiteSettings | undefined> {
    const [settings] = await db.select().from(siteSettings).limit(1);
    return settings || undefined;
  }

  async updateSiteSettings(updateData: Partial<InsertSiteSettings>): Promise<SiteSettings | undefined> {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('Update data cannot be empty');
    }

    // Filter only null and undefined values, but allow empty strings (to enable field clearing)
    const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => {
        // Keep if not null/undefined - allow empty strings
        return value !== null && value !== undefined;
      })
    );

    console.log('🔍 [STORAGE] Original update data:', updateData);
    console.log('🔍 [STORAGE] Filtered update data:', filteredUpdateData);

    if (Object.keys(filteredUpdateData).length === 0) {
      console.log('🔍 [STORAGE] No valid fields to update after filtering');
      throw new Error('No valid fields to update');
    }

    const existingSettings = await this.getSiteSettings();

    if (existingSettings) {
      const [settings] = await db.update(siteSettings)
        .set({ ...filteredUpdateData, updatedAt: new Date() })
        .where(eq(siteSettings.id, existingSettings.id))
        .returning();
      console.log('🔍 [STORAGE] Updated existing settings:', settings);
      return settings || undefined;
    } else {
      const [settings] = await db.insert(siteSettings)
        .values({ ...filteredUpdateData, createdAt: new Date(), updatedAt: new Date() })
        .returning();
      console.log('🔍 [STORAGE] Created new settings:', settings);
      return settings;
    }
  }

  // Chat Settings
  async getChatSettings(): Promise<ChatSettings | undefined> {
    try {
      const [settings] = await db.select().from(chatSettings).limit(1);
      return settings || undefined;
    } catch (error) {
      console.error('Error fetching chat settings:', error);
      return undefined;
    }
  }

  async updateChatSettings(updateData: Partial<InsertChatSettings>): Promise<ChatSettings | undefined> {
    try {
      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('Update data cannot be empty');
      }

      const current = await this.getChatSettings();
      
      if (current) {
        // Convert string Buffer fields to actual Buffers if needed
        const convertedData: any = { ...updateData, updatedAt: new Date() };
        if (updateData.botIcon !== undefined && typeof updateData.botIcon === 'string') {
          convertedData.botIcon = Buffer.from(updateData.botIcon, 'base64');
        }
        if (updateData.userIcon !== undefined && typeof updateData.userIcon === 'string') {
          convertedData.userIcon = Buffer.from(updateData.userIcon, 'base64');
        }
        const [updated] = await db
          .update(chatSettings)
          .set(convertedData as any)
          .where(eq(chatSettings.id, current.id))
          .returning();
        return updated;
      } else {
        return this.createDefaultChatSettings();
      }
    } catch (error) {
      console.error('Error updating chat settings:', error);
      throw error;
    }
  }

  async createDefaultChatSettings(): Promise<ChatSettings> {
    try {
      const defaultData: InsertChatSettings = {
        welcomeMessage: "Olá! Como posso te ajudar hoje?",
        placeholderText: "Digite sua mensagem...",
        chatTitle: "Atendimento Virtual",
        buttonIcon: "MessageCircle",
        botIcon: null,
        userIcon: null,
        chatPosition: "bottom-right",
        chatSize: "md",
        isEnabled: true,
      };

      const [created] = await db.insert(chatSettings).values(defaultData as any).returning();
      return created;
    } catch (error) {
      console.error('Error creating default chat settings:', error);
      throw error;
    }
  }

  // Clients
  async getClientByEmail(email: string): Promise<Client | undefined> {
    try {
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.email, email))
        .limit(1);
      return client;
    } catch (error) {
      console.error('❌ Error fetching client by email:', error);
      return undefined;
    }
  }

  async getClientById(id: string): Promise<Client | undefined> {
    try {
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, id))
        .limit(1);
      return client;
    } catch (error) {
      console.error('❌ Error fetching client by id:', error);
      return undefined;
    }
  }

  async getClientByCpf(cpf: string): Promise<Client | undefined> {
    try {
      // Try exact match first
      let [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.cpf, cpf))
        .limit(1);
      
      // If not found and CPF is sanitized (digits only), try formatted variations
      if (!client && /^\d+$/.test(cpf)) {
        // Try common CPF format: 000.000.000-00
        const formatted = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        [client] = await db
          .select()
          .from(clients)
          .where(eq(clients.cpf, formatted))
          .limit(1);
      }
      
      return client;
    } catch (error) {
      console.error('❌ Error fetching client by cpf:', error);
      return undefined;
    }
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values(client as any)
      .returning();
    return newClient;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    try {
      const [updatedClient] = await db
        .update(clients)
        .set({ ...client, updatedAt: new Date() })
        .where(eq(clients.id, id))
        .returning();
      return updatedClient;
    } catch (error) {
      console.error('❌ Error updating client:', error);
      return undefined;
    }
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(clients)
        .where(eq(clients.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('❌ Error deleting client:', error);
      return false;
    }
  }

  async getAllClients(): Promise<Client[]> {
    try {
      const clientsList = await db.select().from(clients);
      return clientsList;
    } catch (error) {
      console.error('❌ Error fetching all clients:', error);
      return [];
    }
  }

  // Sellers
  async getSellerByEmail(email: string): Promise<Seller | undefined> {
    try {
      const [seller] = await db
        .select()
        .from(sellers)
        .where(eq(sellers.email, email))
        .limit(1);
      return seller;
    } catch (error) {
      console.error('❌ Error fetching seller by email:', error);
      return undefined;
    }
  }

  async getSellerById(id: string): Promise<Seller | undefined> {
    try {
      const [seller] = await db
        .select()
        .from(sellers)
        .where(eq(sellers.id, id))
        .limit(1);
      return seller;
    } catch (error) {
      console.error('❌ Error fetching seller by id:', error);
      return undefined;
    }
  }

  async getSellerByWhitelabelUrl(whitelabelUrl: string): Promise<Seller | undefined> {
    try {
      const [seller] = await db
        .select()
        .from(sellers)
        .where(eq(sellers.whitelabelUrl, whitelabelUrl))
        .limit(1);
      return seller;
    } catch (error) {
      console.error('❌ Error fetching seller by whitelabel URL:', error);
      return undefined;
    }
  }

  async createSeller(seller: InsertSeller): Promise<Seller> {
    const [newSeller] = await db
      .insert(sellers)
      .values(seller as any)
      .returning();
    return newSeller;
  }

  async updateSeller(id: string, seller: Partial<InsertSeller>): Promise<Seller | undefined> {
    try {
      const [updatedSeller] = await db
        .update(sellers)
        .set({ ...seller, updatedAt: new Date() })
        .where(eq(sellers.id, id))
        .returning();
      return updatedSeller;
    } catch (error) {
      console.error('❌ Error updating seller:', error);
      return undefined;
    }
  }

  async deleteSeller(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(sellers)
        .where(eq(sellers.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('❌ Error deleting seller:', error);
      return false;
    }
  }

  async getAllSellers(): Promise<Seller[]> {
    try {
      const sellersList = await db.select().from(sellers);
      return sellersList;
    } catch (error) {
      console.error('❌ Error fetching all sellers:', error);
      return [];
    }
  }

  // Seller Analytics
  async trackSellerClick(sellerId: string): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if analytics record exists for today
      const [existing] = await db
        .select()
        .from(sellerAnalytics)
        .where(
          and(
            eq(sellerAnalytics.sellerId, sellerId),
            sql`DATE(${sellerAnalytics.date}) = DATE(${today})`
          )
        )
        .limit(1);
      
      if (existing) {
        // Increment clicks
        await db
          .update(sellerAnalytics)
          .set({ 
            clicks: existing.clicks + 1,
            updatedAt: new Date() 
          })
          .where(eq(sellerAnalytics.id, existing.id));
      } else {
        // Create new record for today
        await db.insert(sellerAnalytics).values({
          sellerId,
          date: today,
          clicks: 1,
          conversions: 0,
          revenue: '0.00'
        });
      }
    } catch (error) {
      console.error('❌ Error tracking seller click:', error);
    }
  }

  async trackSellerConversion(sellerId: string, revenue?: number): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if analytics record exists for today
      const [existing] = await db
        .select()
        .from(sellerAnalytics)
        .where(
          and(
            eq(sellerAnalytics.sellerId, sellerId),
            sql`DATE(${sellerAnalytics.date}) = DATE(${today})`
          )
        )
        .limit(1);
      
      if (existing) {
        // Increment conversions and add revenue
        const currentRevenue = parseFloat(existing.revenue || '0');
        const newRevenue = currentRevenue + (revenue || 0);
        
        await db
          .update(sellerAnalytics)
          .set({ 
            conversions: existing.conversions + 1,
            revenue: newRevenue.toFixed(2),
            updatedAt: new Date() 
          })
          .where(eq(sellerAnalytics.id, existing.id));
      } else {
        // Create new record for today
        await db.insert(sellerAnalytics).values({
          sellerId,
          date: today,
          clicks: 0,
          conversions: 1,
          revenue: (revenue || 0).toFixed(2)
        });
      }
    } catch (error) {
      console.error('❌ Error tracking seller conversion:', error);
    }
  }

  async getSellerAnalytics(sellerId: string): Promise<{clicks: number, conversions: number, conversionRate: number}> {
    try {
      // Get aggregated analytics for this seller across all time
      const result = await db
        .select({
          totalClicks: sql<number>`COALESCE(SUM(${sellerAnalytics.clicks}), 0)`,
          totalConversions: sql<number>`COALESCE(SUM(${sellerAnalytics.conversions}), 0)`
        })
        .from(sellerAnalytics)
        .where(eq(sellerAnalytics.sellerId, sellerId));
      
      const totalClicks = result[0]?.totalClicks || 0;
      const totalConversions = result[0]?.totalConversions || 0;
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      
      console.log(`📊 [ANALYTICS] Seller ${sellerId} stats:`, {
        clicks: totalClicks,
        conversions: totalConversions,
        conversionRate: conversionRate.toFixed(2)
      });
      
      return {
        clicks: totalClicks,
        conversions: totalConversions,
        conversionRate: parseFloat(conversionRate.toFixed(2))
      };
    } catch (error) {
      console.error('❌ Error fetching seller analytics:', error);
      return { clicks: 0, conversions: 0, conversionRate: 0 };
    }
  }

  // Seller Payments
  async getSellerPayments(sellerId: string): Promise<any[]> {
    try {
      const payments = await db
        .select()
        .from(sellerPayments)
        .where(eq(sellerPayments.sellerId, sellerId))
        .orderBy(desc(sellerPayments.paymentDate));
      return payments;
    } catch (error) {
      console.error('❌ Error fetching seller payments:', error);
      return [];
    }
  }

  async createSellerPayment(payment: {
    sellerId: string;
    amount: number;
    paymentDate: Date;
    description: string | null;
    createdBy: string;
  }): Promise<any> {
    const [newPayment] = await db
      .insert(sellerPayments)
      .values({
        sellerId: payment.sellerId,
        amount: payment.amount.toFixed(2),
        paymentDate: payment.paymentDate,
        description: payment.description,
        createdBy: payment.createdBy
      })
      .returning();
    return newPayment;
  }

  async getSellerSalesReport(sellerId: string): Promise<any> {
    try {
      console.log('📊 [STORAGE] Getting sales report for seller:', sellerId);
      
      // Get CPA commission from initial contracts (one-time payment per contract)
      // CPA is calculated on the initial sale value:
      // - For annual plans: use annualAmount
      // - For monthly plans: use monthlyAmount
      const cpaData = await db
        .select({
          totalSales: sql<number>`COUNT(*)`,
          cpaCommission: sql<string>`COALESCE(SUM(
            CASE 
              WHEN ${contracts.billingPeriod} = 'annual' THEN
                CAST(${contracts.annualAmount} AS DECIMAL) * CAST(${sellers.cpaPercentage} AS DECIMAL) / 100
              ELSE
                CAST(${contracts.monthlyAmount} AS DECIMAL) * CAST(${sellers.cpaPercentage} AS DECIMAL) / 100
            END
          ), 0)`
        })
        .from(contracts)
        .leftJoin(sellers, eq(contracts.sellerId, sellers.id))
        .where(eq(contracts.sellerId, sellerId));
      
      console.log('📊 [STORAGE] CPA Data:', cpaData[0]);

      // Get recurring commission from all installments paid
      const recurringData = await db
        .select({
          totalRevenue: sql<string>`COALESCE(SUM(CAST(${contractInstallments.amount} AS DECIMAL)), 0)`,
          recurringCommission: sql<string>`COALESCE(SUM(
            CAST(${contractInstallments.amount} AS DECIMAL) * CAST(${sellers.recurringCommissionPercentage} AS DECIMAL) / 100
          ), 0)`
        })
        .from(contractInstallments)
        .leftJoin(contracts, eq(contractInstallments.contractId, contracts.id))
        .leftJoin(sellers, eq(contracts.sellerId, sellers.id))
        .where(
          and(
            eq(contracts.sellerId, sellerId),
            eq(contractInstallments.status, 'paid')
          )
        );
      
      console.log('📊 [STORAGE] Recurring Data:', recurringData[0]);

      // Get total payments made to seller
      const paymentsData = await db
        .select({
          totalPaid: sql<string>`COALESCE(SUM(CAST(${sellerPayments.amount} AS DECIMAL)), 0)`
        })
        .from(sellerPayments)
        .where(eq(sellerPayments.sellerId, sellerId));
      
      console.log('📊 [STORAGE] Payments Data:', paymentsData[0]);

      const totalCpa = parseFloat(cpaData[0]?.cpaCommission || '0');
      const totalRecurring = parseFloat(recurringData[0]?.recurringCommission || '0');
      const totalCommission = totalCpa + totalRecurring;
      const totalPaid = parseFloat(paymentsData[0]?.totalPaid || '0');
      const balance = totalCommission - totalPaid;
      
      console.log('📊 [STORAGE] Calculated values:', {
        totalCpa,
        totalRecurring,
        totalCommission,
        totalPaid,
        balance
      });

      return {
        totalSales: cpaData[0]?.totalSales || 0,
        totalRevenue: parseFloat(recurringData[0]?.totalRevenue || '0'),
        totalCpaCommission: totalCpa,
        totalRecurringCommission: totalRecurring,
        totalCommission,
        totalPaid,
        balance
      };
    } catch (error) {
      console.error('❌ Error fetching seller sales report:', error);
      return {
        totalSales: 0,
        totalRevenue: 0,
        totalCpaCommission: 0,
        totalRecurringCommission: 0,
        totalCommission: 0,
        totalPaid: 0,
        balance: 0
      };
    }
  }

  // === NEW TABLE IMPLEMENTATIONS ===

  // Pets
  async createPet(pet: InsertPet): Promise<Pet> {
    const [newPet] = await db.insert(pets).values(pet as any).returning();
    return newPet;
  }

  async updatePet(id: string, pet: Partial<InsertPet>): Promise<Pet | undefined> {
    const [updatedPet] = await db
      .update(pets)
      .set({ ...pet, updatedAt: new Date() })
      .where(eq(pets.id, id))
      .returning();
    return updatedPet || undefined;
  }

  async getPet(id: string): Promise<Pet | undefined> {
    const [pet] = await db.select().from(pets).where(eq(pets.id, id));
    return pet || undefined;
  }

  async getPetsByClientId(clientId: string): Promise<Pet[]> {
    return await db.select().from(pets).where(eq(pets.clientId, clientId));
  }

  async deletePet(id: string): Promise<boolean> {
    const result = await db.delete(pets).where(eq(pets.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllPets(): Promise<Pet[]> {
    return await db.select().from(pets);
  }

  // Contracts
  async createContract(contract: InsertContract): Promise<Contract> {
    // Gerar contractNumber automaticamente se não fornecido
    const contractNumber = contract.contractNumber || `UNIPET-${Date.now()}-${contract.petId?.substring(0, 4).toUpperCase() || 'XXXX'}`;
    
    // Mapear explicitamente para os campos corretos do schema
    const payload = {
      clientId: contract.clientId,
      planId: contract.planId,
      petId: contract.petId,
      sellerId: (contract as any).sellerId || null, // Include sellerId for commission tracking
      contractNumber: contractNumber, // Drizzle espera este nome exato
      status: contract.status || 'active',
      startDate: contract.startDate || new Date(),
      monthlyAmount: contract.monthlyAmount,
      paymentMethod: contract.paymentMethod,
      cieloPaymentId: contract.cieloPaymentId,
      // Annual plan fields
      ...((contract as any).billingPeriod !== undefined && { billingPeriod: (contract as any).billingPeriod }),
      ...((contract as any).annualAmount !== undefined && { annualAmount: (contract as any).annualAmount }),
      // Payment proof fields - properly typed access
      ...((contract as any).proofOfSale !== undefined && { proofOfSale: (contract as any).proofOfSale }),
      ...((contract as any).authorizationCode !== undefined && { authorizationCode: (contract as any).authorizationCode }),
      ...((contract as any).tid !== undefined && { tid: (contract as any).tid }),
      ...((contract as any).receivedDate !== undefined && { receivedDate: (contract as any).receivedDate }),
      ...((contract as any).returnCode !== undefined && { returnCode: (contract as any).returnCode }),
      ...((contract as any).returnMessage !== undefined && { returnMessage: (contract as any).returnMessage }),
      ...((contract as any).pixQrCode !== undefined && { pixQrCode: (contract as any).pixQrCode }),
      ...((contract as any).pixCode !== undefined && { pixCode: (contract as any).pixCode })
    };
    
    console.log("🔍 [STORAGE-DEBUG] Payload mapeado para Drizzle:", JSON.stringify(payload, null, 2));
    
    const [newContract] = await db.insert(contracts).values(payload).returning();
    return newContract;
  }

  async updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updatedContract] = await db
      .update(contracts)
      .set({ ...contract, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updatedContract || undefined;
  }

  async getContract(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract || undefined;
  }

  async getContractsByClientId(clientId: string): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.clientId, clientId));
  }

  async getContractsByPetId(petId: string): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.petId, petId));
  }

  async getContractByCieloPaymentId(cieloPaymentId: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.cieloPaymentId, cieloPaymentId));
    return contract || undefined;
  }

  async deleteContract(id: string): Promise<boolean> {
    const result = await db.delete(contracts).where(eq(contracts.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllContracts(): Promise<Contract[]> {
    return await db.select().from(contracts);
  }

  async getAllInstallments() {
    return await db.select().from(contractInstallments);
  }

  // Procedures
  async createProcedure(procedure: InsertProcedure): Promise<Procedure> {
    const [newProcedure] = await db.insert(procedures).values(procedure as any).returning();
    return newProcedure;
  }

  async updateProcedure(id: string, procedure: Partial<InsertProcedure>): Promise<Procedure | undefined> {
    const [updatedProcedure] = await db
      .update(procedures)
      .set({ ...procedure, updatedAt: new Date() })
      .where(eq(procedures.id, id))
      .returning();
    return updatedProcedure || undefined;
  }

  async getProcedure(id: string): Promise<Procedure | undefined> {
    const [procedure] = await db.select().from(procedures).where(eq(procedures.id, id));
    return procedure || undefined;
  }

  async getAllProcedures(): Promise<Procedure[]> {
    return await db.select().from(procedures);
  }

  async getProcedureCategories(): Promise<any[]> {
    const categories = await db.select().from(procedureCategories).where(eq(procedureCategories.isActive, true)).orderBy(procedureCategories.displayOrder);
    return categories;
  }

  async getActiveProcedures(): Promise<any[]> {
    return await db.select().from(procedures).where(eq(procedures.isActive, true));
  }

  // Get procedures with real coparticipation data from plan_procedures
  async getProceduresWithCoparticipation(planId?: string): Promise<any[]> {
    try {
      if (planId) {
        // Get procedures for specific plan using raw SQL to access correct column names
        const result = await db.execute(sql`
          SELECT 
            p.id,
            p.name,
            p.description,
            p.category,
            p.is_active,
            p.created_at,
            p.display_order,
            pp.coparticipacao,

            pp.pay_value,
            pp.is_included,
            pp.plan_id
          FROM procedures p
          INNER JOIN plan_procedures pp ON p.id = pp.procedure_id
          WHERE p.is_active = true 
            AND pp.plan_id = ${planId}
            AND pp.is_included = true
          ORDER BY p.display_order ASC, p.name ASC
        `);
        
        return result.rows;
      } else {
        // Get all distinct procedures (avoiding duplicates from plan relationships)
        const result = await db.execute(sql`
          SELECT DISTINCT
            p.id,
            p.name,
            p.description,
            p.category,
            p.is_active,
            p.created_at,
            p.display_order,
            NULL as coparticipacao,

            NULL as pay_value,
            NULL as is_included,
            NULL as plan_id
          FROM procedures p
          WHERE p.is_active = true
          ORDER BY p.display_order ASC, p.name ASC
        `);
        
        return result.rows;
      }
    } catch (error) {
      console.error('❌ Error fetching procedures with coparticipation:', error);
      return [];
    }
  }

  async deleteProcedure(id: string): Promise<boolean> {
    const result = await db.delete(procedures).where(eq(procedures.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Plan Procedures
  async createPlanProcedure(planProcedure: InsertPlanProcedure): Promise<PlanProcedure> {
    const [newPlanProcedure] = await db.insert(planProcedures).values(planProcedure as any).returning();
    return newPlanProcedure;
  }

  async getPlanProcedures(planId: string): Promise<PlanProcedure[]> {
    return await db.select().from(planProcedures).where(eq(planProcedures.planId, planId));
  }

  async deletePlanProcedure(planId: string, procedureId: string): Promise<boolean> {
    const result = await db
      .delete(planProcedures)
      .where(
        eq(planProcedures.planId, planId) && eq(planProcedures.procedureId, procedureId)
      );
    return (result.rowCount || 0) > 0;
  }

  async getAllPlanProcedures(): Promise<PlanProcedure[]> {
    return await db.select().from(planProcedures);
  }

  // Service History
  async createServiceHistory(serviceHistoryData: InsertServiceHistory): Promise<ServiceHistory> {
    const [newServiceHistory] = await db.insert(serviceHistory).values(serviceHistoryData as any).returning();
    return newServiceHistory;
  }

  async updateServiceHistory(id: string, serviceHistoryData: Partial<InsertServiceHistory>): Promise<ServiceHistory | undefined> {
    const [updatedServiceHistory] = await db
      .update(serviceHistory)
      .set({ ...serviceHistoryData, updatedAt: new Date() })
      .where(eq(serviceHistory.id, id))
      .returning();
    return updatedServiceHistory || undefined;
  }

  async getServiceHistory(id: string): Promise<ServiceHistory | undefined> {
    const [history] = await db.select().from(serviceHistory).where(eq(serviceHistory.id, id));
    return history || undefined;
  }

  async getServiceHistoryByContractId(contractId: string): Promise<ServiceHistory[]> {
    return await db.select().from(serviceHistory).where(eq(serviceHistory.contractId, contractId));
  }

  async getServiceHistoryByPetId(petId: string): Promise<ServiceHistory[]> {
    return await db.select().from(serviceHistory).where(eq(serviceHistory.petId, petId));
  }

  async getAllServiceHistory(): Promise<ServiceHistory[]> {
    return await db.select().from(serviceHistory);
  }

  // Protocols
  async createProtocol(protocol: InsertProtocol): Promise<Protocol> {
    const [newProtocol] = await db.insert(protocols).values(protocol as any).returning();
    return newProtocol;
  }

  async updateProtocol(id: string, protocol: Partial<InsertProtocol>): Promise<Protocol | undefined> {
    const [updatedProtocol] = await db
      .update(protocols)
      .set({ ...protocol, updatedAt: new Date() })
      .where(eq(protocols.id, id))
      .returning();
    return updatedProtocol || undefined;
  }

  async getProtocol(id: string): Promise<Protocol | undefined> {
    const [protocol] = await db.select().from(protocols).where(eq(protocols.id, id));
    return protocol || undefined;
  }

  async getProtocolsByClientId(clientId: string): Promise<Protocol[]> {
    return await db.select().from(protocols).where(eq(protocols.clientId, clientId));
  }

  async getAllProtocols(): Promise<Protocol[]> {
    return await db.select().from(protocols);
  }

  async deleteProtocol(id: string): Promise<boolean> {
    const result = await db.delete(protocols).where(eq(protocols.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Guides
  async createGuide(guide: InsertGuide): Promise<Guide> {
    const [newGuide] = await db.insert(guides).values(guide as any).returning();
    return newGuide;
  }

  async updateGuide(id: string, guide: Partial<InsertGuide>): Promise<Guide | undefined> {
    const [updatedGuide] = await db
      .update(guides)
      .set({ ...guide, updatedAt: new Date() })
      .where(eq(guides.id, id))
      .returning();
    return updatedGuide || undefined;
  }

  async getGuide(id: string): Promise<Guide | undefined> {
    const [guide] = await db.select().from(guides).where(eq(guides.id, id));
    return guide || undefined;
  }

  async getAllGuides(): Promise<Guide[]> {
    return await db.select().from(guides);
  }

  async getActiveGuides(): Promise<Guide[]> {
    return await db.select().from(guides).where(eq(guides.status, "open"));
  }

  async deleteGuide(id: string): Promise<boolean> {
    const result = await db.delete(guides).where(eq(guides.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Satisfaction Surveys
  async createSatisfactionSurvey(survey: InsertSatisfactionSurvey): Promise<SatisfactionSurvey> {
    const [newSurvey] = await db.insert(satisfactionSurveys).values(survey as any).returning();
    return newSurvey;
  }

  async getSatisfactionSurvey(id: string): Promise<SatisfactionSurvey | undefined> {
    const [survey] = await db.select().from(satisfactionSurveys).where(eq(satisfactionSurveys.id, id));
    return survey || undefined;
  }

  async getSatisfactionSurveysByClientId(clientId: string): Promise<SatisfactionSurvey[]> {
    return await db.select().from(satisfactionSurveys).where(eq(satisfactionSurveys.clientId, clientId));
  }

  async getAllSatisfactionSurveys(): Promise<SatisfactionSurvey[]> {
    return await db.select().from(satisfactionSurveys);
  }

  // Species
  async getSpecies(): Promise<Species[]> {
    return await db.select()
      .from(species)
      .where(eq(species.isActive, true))
      .orderBy(asc(species.displayOrder));
  }

  async getAllSpecies(): Promise<Species[]> {
    return await db.select()
      .from(species)
      .orderBy(asc(species.displayOrder));
  }

  async getActiveSpecies(): Promise<Species[]> {
    return await this.getSpecies();
  }

  async createSpecies(speciesData: InsertSpecies): Promise<Species> {
    const [newSpecies] = await db.insert(species).values(speciesData as any).returning();
    return newSpecies;
  }

  async updateSpecies(id: string, speciesData: Partial<InsertSpecies>): Promise<Species | undefined> {
    const [updatedSpecies] = await db
      .update(species)
      .set({ ...speciesData, updatedAt: new Date() })
      .where(eq(species.id, id))
      .returning();
    return updatedSpecies || undefined;
  }

  async deleteSpecies(id: string): Promise<boolean> {
    const result = await db.delete(species).where(eq(species.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Payment Receipts
  async createPaymentReceipt(receipt: any): Promise<any> {
    const [newReceipt] = await db.insert(paymentReceipts).values(receipt as any).returning();
    return newReceipt;
  }

  async getPaymentReceiptById(id: string): Promise<any | undefined> {
    const [receipt] = await db.select().from(paymentReceipts).where(eq(paymentReceipts.id, id));
    return receipt || undefined;
  }

  async getPaymentReceiptsByClientEmail(clientEmail: string): Promise<any[]> {
    return await db.select().from(paymentReceipts)
      .where(eq(paymentReceipts.clientEmail, clientEmail))
      .orderBy(desc(paymentReceipts.createdAt));
  }

  async getPaymentReceiptsByContractId(contractId: string): Promise<any[]> {
    return await db.select().from(paymentReceipts)
      .where(eq(paymentReceipts.contractId, contractId))
      .orderBy(desc(paymentReceipts.createdAt));
  }

  async updatePaymentReceiptStatus(id: string, status: 'generated' | 'downloaded' | 'sent'): Promise<any | undefined> {
    const [updatedReceipt] = await db
      .update(paymentReceipts)
      .set({ status, updatedAt: new Date() })
      .where(eq(paymentReceipts.id, id))
      .returning();
    return updatedReceipt || undefined;
  }

  // ✅ IDEMPOTÊNCIA: Buscar recibo por cieloPaymentId para evitar duplicatas
  async getPaymentReceiptByCieloPaymentId(cieloPaymentId: string): Promise<any | undefined> {
    const [receipt] = await db.select().from(paymentReceipts)
      .where(eq(paymentReceipts.cieloPaymentId, cieloPaymentId));
    return receipt || undefined;
  }

  // Chat Conversations - Removed (table no longer exists)

  // ====== Additional Database Methods Required by Routes ======
  
  async getProcedureUsageByClient(clientId: string, year: number): Promise<any[]> {
    const usage = await db
      .select({
        id: procedureUsage.id,
        petId: procedureUsage.petId,
        procedureId: procedureUsage.procedureId,
        planId: procedureUsage.planId,
        year: procedureUsage.year,
        usageCount: procedureUsage.usageCount,
        createdAt: procedureUsage.createdAt,
        updatedAt: procedureUsage.updatedAt,
      })
      .from(procedureUsage)
      .innerJoin(pets, eq(procedureUsage.petId, pets.id))
      .where(
        and(
          eq(pets.clientId, clientId),
          eq(procedureUsage.year, year)
        )
      );
    return usage;
  }

  async getPlanProceduresWithDetails(planId: string): Promise<any[]> {
    const result = await db
      .select({
        procedureId: planProcedures.procedureId,
        procedureName: procedures.name,
        price: planProcedures.price,
        payValue: planProcedures.payValue,
        coparticipacao: planProcedures.coparticipacao,
        carencia: planProcedures.carencia,
        limitesAnuais: planProcedures.limitesAnuais,
        isIncluded: planProcedures.isIncluded,
      })
      .from(planProcedures)
      .innerJoin(procedures, eq(planProcedures.procedureId, procedures.id))
      .where(eq(planProcedures.planId, planId));
    return result;
  }

  async getProcedureUsageByPet(petId: string, year: number): Promise<any[]> {
    const usage = await db
      .select()
      .from(procedureUsage)
      .where(
        and(
          eq(procedureUsage.petId, petId),
          eq(procedureUsage.year, year)
        )
      );
    return usage;
  }

  async incrementProcedureUsage(petId: string, procedureId: string, planId: string): Promise<any> {
    const currentYear = new Date().getFullYear();
    
    // Check if record exists
    const [existing] = await db
      .select()
      .from(procedureUsage)
      .where(
        and(
          eq(procedureUsage.petId, petId),
          eq(procedureUsage.procedureId, procedureId),
          eq(procedureUsage.planId, planId),
          eq(procedureUsage.year, currentYear)
        )
      );

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(procedureUsage)
        .set({ usageCount: existing.usageCount + 1 })
        .where(eq(procedureUsage.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new record
      const [newUsage] = await db
        .insert(procedureUsage)
        .values({
          id: crypto.randomUUID(),
          petId,
          procedureId,
          planId,
          year: currentYear,
          usageCount: 1,
        })
        .returning();
      return newUsage;
    }
  }

  async getUserByEmail(email: string): Promise<any | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllPaymentReceipts(): Promise<any[]> {
    return await db.select().from(paymentReceipts).orderBy(desc(paymentReceipts.createdAt));
  }

  async getRulesSettings(): Promise<any | undefined> {
    const [settings] = await db.select().from(rulesSettings);
    return settings || undefined;
  }

  async updateRulesSettings(settingsData: any): Promise<any | undefined> {
    const [existing] = await db.select().from(rulesSettings);
    
    if (existing) {
      const [updated] = await db
        .update(rulesSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(rulesSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(rulesSettings)
        .values({
          id: crypto.randomUUID(),
          ...settingsData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return created;
    }
  }

  async getProcedurePlans(procedureId: string): Promise<any[]> {
    return await db.select().from(planProcedures).where(eq(planProcedures.procedureId, procedureId));
  }

  async updateProcedurePlans(procedureId: string, plans: any[]): Promise<void> {
    // Delete existing procedure plans
    await db.delete(planProcedures).where(eq(planProcedures.procedureId, procedureId));
    
    // Insert new procedure plans
    if (plans.length > 0) {
      await db.insert(planProcedures).values(
        plans.map(p => ({
          id: crypto.randomUUID(),
          procedureId,
          planId: p.planId,
          waitingPeriodDays: p.waitingPeriodDays || 0,
          coparticipationOverride: p.coparticipationOverride || null,
          coverageOverride: p.coverageOverride || null,
          isIncluded: p.isIncluded !== undefined ? p.isIncluded : true,
          createdAt: new Date(),
        }))
      );
    }
  }

  async getAllUsers(): Promise<any[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(userData: any): Promise<any> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: any): Promise<any | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllCoupons(): Promise<any[]> {
    return await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }

  async getCouponById(id: string): Promise<any | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id));
    return coupon || undefined;
  }

  async createCoupon(couponData: any): Promise<any> {
    const [coupon] = await db
      .insert(coupons)
      .values({
        id: crypto.randomUUID(),
        ...couponData,
        code: couponData.code.toUpperCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return coupon;
  }

  async updateCoupon(id: string, couponData: any): Promise<any | undefined> {
    const [updated] = await db
      .update(coupons)
      .set({ 
        ...couponData, 
        code: couponData.code ? couponData.code.toUpperCase() : undefined,
        updatedAt: new Date() 
      })
      .where(eq(coupons.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const result = await db.delete(coupons).where(eq(coupons.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async validateCoupon(code: string, amount?: number): Promise<{ valid: boolean; discount?: number; message?: string; coupon?: any }> {
    const upperCode = code.toUpperCase();
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, upperCode));
    
    if (!coupon) {
      return { valid: false, message: 'Cupom não encontrado' };
    }
    
    if (!coupon.isActive) {
      return { valid: false, message: 'Cupom inativo' };
    }
    
    const now = new Date();
    if (coupon.validFrom && now < new Date(coupon.validFrom)) {
      return { valid: false, message: 'Cupom ainda não está válido' };
    }
    
    if (coupon.validUntil && now > new Date(coupon.validUntil)) {
      return { valid: false, message: 'Cupom expirado' };
    }
    
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, message: 'Cupom atingiu limite de uso' };
    }
    
    let discount: number | undefined = undefined;
    if (amount !== undefined) {
      discount = coupon.type === 'percentage' 
        ? (amount * parseFloat(coupon.value)) / 100 
        : parseFloat(coupon.value);
    }
    
    return { valid: true, discount, coupon };
  }

  async getNetworkUnitBySlug(slug: string): Promise<NetworkUnit | undefined> {
    const [unit] = await db.select().from(networkUnits).where(eq(networkUnits.urlSlug, slug));
    return unit || undefined;
  }

  async incrementCouponUsage(couponId: string): Promise<void> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, couponId));
    if (coupon) {
      await db
        .update(coupons)
        .set({ usageCount: coupon.usageCount + 1 })
        .where(eq(coupons.id, couponId));
    }
  }

  async createContractInstallment(installmentData: any): Promise<any> {
    const [installment] = await db
      .insert(contractInstallments)
      .values({
        id: crypto.randomUUID(),
        ...installmentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return installment;
  }

  async updateContractInstallment(id: string, installmentData: any): Promise<any | undefined> {
    const [updated] = await db
      .update(contractInstallments)
      .set({ ...installmentData, updatedAt: new Date() })
      .where(eq(contractInstallments.id, id))
      .returning();
    return updated || undefined;
  }

  async getContractInstallmentsByContractId(contractId: string): Promise<any[]> {
    return await db
      .select()
      .from(contractInstallments)
      .where(eq(contractInstallments.contractId, contractId))
      .orderBy(contractInstallments.installmentNumber);
  }

  async getContractInstallmentById(id: string): Promise<any | undefined> {
    const [installment] = await db.select().from(contractInstallments).where(eq(contractInstallments.id, id));
    return installment || undefined;
  }

  async getGuidesWithNetworkUnits(filters: any): Promise<any> {
    const conditions: any[] = [];
    
    // Build filter conditions
    if (filters.networkUnitId) {
      conditions.push(eq(guides.networkUnitId, filters.networkUnitId));
    }
    if (filters.clientId) {
      conditions.push(eq(guides.clientId, filters.clientId));
    }
    if (filters.petId) {
      conditions.push(eq(guides.petId, filters.petId));
    }
    if (filters.status) {
      conditions.push(eq(guides.status, filters.status));
    }

    // Build and execute query with client and pet data
    const baseQuery = db
      .select({
        guide: guides,
        networkUnit: networkUnits,
        client: clients,
        pet: pets,
      })
      .from(guides)
      .leftJoin(networkUnits, eq(guides.networkUnitId, networkUnits.id))
      .leftJoin(clients, eq(guides.clientId, clients.id))
      .leftJoin(pets, eq(guides.petId, pets.id));

    const results = conditions.length > 0
      ? await baseQuery.where(and(...conditions)).orderBy(desc(guides.createdAt))
      : await baseQuery.orderBy(desc(guides.createdAt));
    
    return {
      guides: results.map(r => ({
        ...r.guide,
        networkUnit: r.networkUnit,
        clientName: r.client?.fullName || null,
        petName: r.pet?.name || null,
      })),
      total: results.length,
    };
  }

  async getContractInstallmentByCieloPaymentId(cieloPaymentId: string): Promise<any | undefined> {
    const [installment] = await db
      .select()
      .from(contractInstallments)
      .where(eq(contractInstallments.cieloPaymentId, cieloPaymentId));
    return installment || undefined;
  }

}

// Usar storage em memória se não houver banco de dados configurado
export const storage = autoConfig.get('DATABASE_URL')
  ? new DatabaseStorage()
  : new InMemoryStorage();