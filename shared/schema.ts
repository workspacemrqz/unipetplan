import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, decimal, json, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Custom bytea type for storing binary data
export const bytea = customType<{ data: Buffer }>({ 
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer) {
    return value;
  },
  fromDriver(value: unknown) {
    return value as Buffer;
  },
});

// === UNIFIED ENUMS ===

export const planTypeEnum = pgEnum("plan_type_enum", ["with_waiting_period", "without_waiting_period"]);
export const planBillingFrequencyEnum = pgEnum("plan_billing_frequency_enum", ["monthly", "annual"]);
export const paymentMethodEnum = pgEnum("payment_method_enum", ["cartao", "pix"]);
export const speciesEnum = pgEnum("species_enum", ["dog", "cat", "other"]);
export const contractStatusEnum = pgEnum("contract_status_enum", ["active", "inactive", "suspended", "cancelled", "pending"]);
export const billingPeriodEnum = pgEnum("billing_period_enum", ["monthly", "annual"]);
export const serviceStatusEnum = pgEnum("service_status_enum", ["requested", "approved", "in_progress", "completed", "rejected"]);
export const protocolStatusEnum = pgEnum("protocol_status_enum", ["open", "in_progress", "resolved", "closed"]);
export const protocolTypeEnum = pgEnum("protocol_type_enum", ["complaint", "information", "plan_change", "cancellation", "emergency", "other"]);
export const receiptStatusEnum = pgEnum("receipt_status_enum", ["generated", "downloaded", "sent"]);

// Enum para tipo de cupom
export const couponTypeEnum = pgEnum("coupon_type_enum", ["percentage", "fixed_value"]);

// Enum para tipo de chave PIX
export const pixKeyTypeEnum = pgEnum("pix_key_type_enum", ["cpf", "cnpj", "email", "phone", "random"]);

// === ADMIN-SPECIFIC TABLES ===

// Users table for authentication and administration (Admin only)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("admin"),
  permissions: json("permissions").$type<string[]>().default([]),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  isActive: boolean("is_active").default(true),
});

// Rules settings table (Admin only)
export const rulesSettings = pgTable("rules_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fixedPercentage: decimal("fixed_percentage", { precision: 5, scale: 2 }).default("0.00"), // Percentage for automatic calculation of pay value (0-100)
  coparticipationPercentage: decimal("coparticipation_percentage", { precision: 5, scale: 2 }).default("10.00"), // Percentage for automatic calculation of coparticipation (0-100)
  defaultCpaPercentage: decimal("default_cpa_percentage", { precision: 5, scale: 2 }).default("0.00"), // Default CPA percentage for new sellers
  defaultRecurringCommissionPercentage: decimal("default_recurring_commission_percentage", { precision: 5, scale: 2 }).default("0.00"), // Default recurring commission percentage for new sellers
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});


// === SHARED CORE TABLES (with unified fields) ===

// Contact submissions table (identical in both systems)
export const contactSubmissions = pgTable("contact_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  petName: text("pet_name").notNull(),
  animalType: text("animal_type").notNull(),
  petAge: text("pet_age").notNull(),
  planInterest: text("plan_interest").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Unified plans table (UNIPET version with all payment fields)
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  features: text("features").array().notNull(),
  image: text("image").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  buttonText: text("button_text").default("Contratar Plano").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  planType: planTypeEnum("plan_type").default("with_waiting_period").notNull(),
  billingFrequency: planBillingFrequencyEnum("billing_frequency").default("monthly").notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).default("0.00").notNull(),
  installmentPrice: decimal("installment_price", { precision: 10, scale: 2 }),
  installmentCount: integer("installment_count"),
  perPetBilling: boolean("per_pet_billing").default(false).notNull(),
  petDiscounts: json("pet_discounts").default(sql`'{}'::json`),
  paymentDescription: text("payment_description"),
  availablePaymentMethods: json("available_payment_methods").default(sql`'["cartao", "pix"]'::json`).notNull(),
  availableBillingOptions: json("available_billing_options").default(sql`'["monthly"]'::json`).notNull(),
  annualPrice: decimal("annual_price", { precision: 10, scale: 2 }),
  annualInstallmentPrice: decimal("annual_installment_price", { precision: 10, scale: 2 }),
  annualInstallmentCount: integer("annual_installment_count").default(12),
});

// Unified network units table (includes Admin fields)
export const networkUnits = pgTable("network_units", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  cidade: text("cidade").notNull(),
  phone: text("phone").notNull(),
  services: text("services").array().notNull(),
  imageUrl: text("image_url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  whatsapp: text("whatsapp"),
  googleMapsUrl: text("google_maps_url"),
  imageData: text("image_data"),
  // Admin-specific fields
  urlSlug: text("url_slug").unique(),
  login: text("login").unique(),
  senhaHash: text("senha_hash"),
});

// FAQ items table (identical in both systems)
export const faqItems = pgTable("faq_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  displayOrder: integer("display_order").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Unified site settings table (includes both Admin cores field and UNIPET image URL fields)
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  whatsapp: text("whatsapp"),
  email: text("email"),
  phone: text("phone"),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  linkedinUrl: text("linkedin_url"),
  youtubeUrl: text("youtube_url"),
  cnpj: text("cnpj"),
  businessHours: text("business_hours"),
  ourStory: text("our_story"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  privacyPolicy: text("privacy_policy"),
  termsOfUse: text("terms_of_use"),
  address: text("address"),
  mainImage: bytea("main_image"),
  networkImage: bytea("network_image"),
  aboutImage: bytea("about_image"),
  // UNIPET image URL fields
  mainImageUrl: text("main_image_url"),
  networkImageUrl: text("network_image_url"),
  aboutImageUrl: text("about_image_url"),
  // Admin cores field
  cores: json("cores").$type<{[key: string]: string}>().default({}),
});

// Unified clients table (UNIPET version with all fields, includes compatibility)
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fullName: text("full_name").notNull(), // UNIPET field name - changed to camelCase for consistency
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  cpf: text("cpf"), // Optional in UNIPET, required in Admin - made optional for compatibility
  cep: text("cep"),
  address: text("address"),
  number: text("number"),
  complement: text("complement"),
  district: text("district"),
  state: text("state"),
  city: text("city"),
  // UNIPET-specific fields
  cpfHash: text("cpf_hash"), // CPF hasheado com bcrypt para autenticação (email + CPF login)
  image: text("image"), // Dados da imagem em base64
  imageUrl: text("image_url"), // URL da imagem
  createdByUnitId: varchar("created_by_unit_id"), // Track which unit created this client
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sellers table for partner management
export const sellers = pgTable("sellers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Dados fiscais
  fullName: text("full_name").notNull(),
  cpf: text("cpf").notNull(),
  cpfHash: text("cpf_hash").notNull(), // CPF hasheado para autenticação (senha)
  // Contato
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  // Endereço
  cep: text("cep").notNull(),
  address: text("address").notNull(),
  number: text("number").notNull(),
  complement: text("complement"),
  district: text("district").notNull(), // Bairro
  state: text("state").notNull(),
  city: text("city").notNull(),
  // Dados de pagamento
  pixKey: text("pix_key").notNull(),
  pixKeyType: pixKeyTypeEnum("pix_key_type").notNull(),
  bank: text("bank").notNull(),
  accountNumber: text("account_number").notNull(),
  fullNameForPayment: text("full_name_for_payment").notNull(), // Nome completo para conta
  agency: text("agency").notNull(), // Agência
  // Comissões
  cpaPercentage: decimal("cpa_percentage", { precision: 5, scale: 2 }).notNull(), // Porcentagem CPA (ex: 30.00)
  recurringCommissionPercentage: decimal("recurring_commission_percentage", { precision: 5, scale: 2 }).notNull(), // Porcentagem comissão recorrente (ex: 5.00)
  // Whitelabel
  whitelabelUrl: text("whitelabel_url").unique(), // URL única para página do vendedor
  // Status e timestamps
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Seller Analytics - Track clicks and conversions for seller links
export const sellerAnalytics = pgTable("seller_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => sellers.id),
  date: timestamp("date").notNull().default(sql`CURRENT_TIMESTAMP`),
  clicks: integer("clicks").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Seller Payments - Track payments made to sellers
export const sellerPayments = pgTable("seller_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => sellers.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  description: text("description"), // Optional description/notes
  createdBy: text("created_by").notNull(), // Admin who created the payment
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Unified pets table (UNIPET version with all fields)
export const pets = pgTable("pets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  species: text("species").notNull(),
  breed: text("breed"),
  birthDate: timestamp("birth_date"),
  age: text("age"),
  sex: text("sex").notNull(),
  castrated: boolean("castrated").default(false),
  color: text("color"),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  microchip: text("microchip"),
  previousDiseases: text("previous_diseases"),
  surgeries: text("surgeries"),
  allergies: text("allergies"),
  currentMedications: text("current_medications"),
  hereditaryConditions: text("hereditary_conditions"),
  vaccineData: json("vaccine_data").default(sql`'[]'::json`),
  lastCheckup: timestamp("last_checkup"),
  parasiteTreatments: text("parasite_treatments"), // UNIPET naming
  planId: varchar("plan_id").references(() => plans.id),
  image: text("image"), // UNIPET-specific
  imageUrl: text("image_url"), // UNIPET-specific
  isActive: boolean("is_active").default(true).notNull(),
  createdByUnitId: varchar("created_by_unit_id"), // Track which unit created this pet
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === UNIPET-SPECIFIC TABLES ===

export const chatSettings = pgTable("chat_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  welcomeMessage: text("welcome_message").default("Olá! Como posso te ajudar hoje?").notNull(),
  placeholderText: text("placeholder_text").default("Digite sua mensagem...").notNull(),
  chatTitle: text("chat_title").default("Atendimento Virtual").notNull(),
  buttonIcon: text("button_icon").default("MessageCircle").notNull(),
  botIcon: bytea("bot_icon"),
  userIcon: bytea("user_icon"),
  botIconUrl: text("bot_icon_url"),
  userIconUrl: text("user_icon_url"),
  chatPosition: text("chat_position").default("bottom-right").notNull(),
  chatSize: text("chat_size").default("md").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const species = pgTable("species", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => plans.id),
  petId: varchar("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  sellerId: varchar("seller_id").references(() => sellers.id), // Vendedor responsável pela venda
  contractNumber: text("contract_number").notNull().unique(),
  status: contractStatusEnum("status").default("active").notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  billingPeriod: billingPeriodEnum("billing_period").default("monthly").notNull(),
  monthlyAmount: decimal("monthly_amount", { precision: 10, scale: 2 }).notNull(),
  annualAmount: decimal("annual_amount", { precision: 10, scale: 2 }),
  paymentMethod: text("payment_method").notNull(), // credit_card, pix
  cieloPaymentId: text("cielo_payment_id"),
  hasCoparticipation: boolean("has_coparticipation").default(false).notNull(),
  // Payment proof fields (for credit card and PIX)
  proofOfSale: text("proof_of_sale"), // NSU - Comprovante de venda
  authorizationCode: text("authorization_code"), // Código de autorização
  tid: text("tid"), // Transaction ID
  receivedDate: timestamp("received_date"), // Data/hora da transação
  returnCode: text("return_code"), // Código de retorno Cielo
  returnMessage: text("return_message"), // Mensagem de retorno Cielo
  // PIX specific fields
  pixQrCode: text("pix_qr_code"), // QR Code PIX em base64
  pixCode: text("pix_code"), // Código PIX copiável
  // Tokenization fields for automatic renewal
  cieloCardToken: varchar("cielo_card_token"), // Token do cartão para cobrança recorrente
  cardBrand: varchar("card_brand"), // Visa, Master, Elo, etc
  cardLastDigits: varchar("card_last_digits", { length: 4 }), // Últimos 4 dígitos para exibir
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceHistory = pgTable("service_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  petId: varchar("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  procedureId: varchar("procedure_id").notNull().references(() => procedures.id),
  networkUnitId: varchar("network_unit_id").references(() => networkUnits.id),
  serviceDate: timestamp("service_date").notNull(),
  status: serviceStatusEnum("status").default("requested").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  coparticipationAmount: decimal("coparticipation_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  coverageAmount: decimal("coverage_amount", { precision: 10, scale: 2 }).notNull(),
  observations: text("observations"),
  veterinarianName: text("veterinarian_name"),
  invoiceNumber: text("invoice_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const protocols = pgTable("protocols", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  contractId: varchar("contract_id").references(() => contracts.id),
  protocolNumber: text("protocol_number").notNull().unique(),
  type: protocolTypeEnum("type").notNull(),
  status: protocolStatusEnum("status").default("open").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("medium").notNull(), // low, medium, high, urgent
  assignedTo: text("assigned_to"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const satisfactionSurveys = pgTable("satisfaction_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  contractId: varchar("contract_id").references(() => contracts.id),
  serviceHistoryId: varchar("service_history_id").references(() => serviceHistory.id),
  protocolId: varchar("protocol_id").references(() => protocols.id),
  rating: integer("rating").notNull(), // 1-5 stars
  feedback: text("feedback"),
  suggestions: text("suggestions"),
  wouldRecommend: boolean("would_recommend"),
  respondedAt: timestamp("responded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentReceipts = pgTable("payment_receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id),
  sellerId: varchar("seller_id").references(() => sellers.id), // Vendedor responsável pela venda
  cieloPaymentId: text("cielo_payment_id").notNull().unique(), // ✅ UNIQUE constraint para idempotência
  receiptNumber: text("receipt_number").notNull().unique(),
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(), // "credit_card", "pix"
  status: receiptStatusEnum("status").default("generated").notNull(),
  pdfFileName: text("pdf_file_name").notNull(),
  pdfObjectKey: text("pdf_object_key").notNull(), // ✅ Armazenar object key ao invés de URL pública
  proofOfSale: text("proof_of_sale"),
  authorizationCode: text("authorization_code"),
  tid: text("tid"),
  returnCode: text("return_code"),
  returnMessage: text("return_message"),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  petName: text("pet_name"),
  planName: text("plan_name"),
  petsData: json("pets_data").$type<Array<{
    name: string;
    species: string;
    breed?: string;
    age?: number;
    weight?: number;
    sex?: string;
    planName: string;
    planType: string;
    value: number;
    discount?: number;
    discountedValue?: number;
  }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Coupons table for managing discounts
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  type: couponTypeEnum("type").notNull(), // "percentage" or "fixed_value"
  value: decimal("value", { precision: 10, scale: 2 }).notNull(), // Percentage (0-100) or fixed value in reais
  usageLimit: integer("usage_limit"), // null means unlimited
  usageCount: integer("usage_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Contract installments (mensalidades) tracking table
export const contractInstallments = pgTable("contract_installments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  installmentNumber: integer("installment_number").notNull(), // 1, 2, 3...
  dueDate: timestamp("due_date").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending").notNull(), // pending, paid, overdue
  cieloPaymentId: varchar("cielo_payment_id"), // ID do pagamento PIX na Cielo para rastreamento
  paymentReceiptId: varchar("payment_receipt_id").references(() => paymentReceipts.id),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === UNIFIED PROCEDURES SYSTEM ===

// Procedure categories table
export const procedureCategories = pgTable("procedure_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Unified procedures table
export const procedures = pgTable("procedures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // consultation, exam, surgery, emergency, etc.
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// UNIPET plan procedures table - Updated to match actual database structure
export const planProcedures = pgTable("plan_procedures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  procedureId: varchar("procedure_id").notNull().references(() => procedures.id, { onDelete: "cascade" }),
  price: integer("price").default(0),
  isIncluded: boolean("is_included").default(true).notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  coparticipacao: integer("coparticipacao").default(0),
  carencia: text("carencia"),
  limitesAnuais: text("limites_anuais"),
  payValue: integer("pay_value").default(0),
});

// Admin procedure plans table (different structure)
export const procedurePlans = pgTable("procedure_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  procedureId: varchar("procedure_id").notNull().references(() => procedures.id, { onDelete: "cascade" }),
  price: integer("price").default(0), // preço a receber em centavos
  payValue: integer("pay_value").default(0), // valor a pagar em centavos (editável pelo usuário)
  coparticipacao: integer("coparticipacao").default(0), // coparticipação em centavos
  carencia: text("carencia"), // período de carência (ex: "30 dias")
  limitesAnuais: text("limites_anuais"), // limites anuais (ex: "2 vezes no ano" ou "ilimitado")
  isIncluded: boolean("is_included").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Procedure usage tracking table
export const procedureUsage = pgTable("procedure_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  petId: varchar("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  procedureId: varchar("procedure_id").notNull().references(() => procedures.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === ADMIN GUIDES SYSTEM (different from UNIPET general guides) ===

// Admin guides table (client-specific guides)
export const guides = pgTable("guides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  petId: varchar("pet_id").notNull().references(() => pets.id),
  networkUnitId: varchar("network_unit_id").references(() => networkUnits.id),
  procedure: text("procedure").notNull(),
  procedureNotes: text("procedure_notes"),
  generalNotes: text("general_notes"),
  value: decimal("value"),
  status: text("status").default("open"), // 'open', 'closed', 'cancelled'
  unitStatus: text("unit_status").default("open"), // 'open', 'closed', 'cancelled' - status specific for network units
  createdByUnitId: varchar("created_by_unit_id"), // Track which unit created this guide
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// === VALIDATION SCHEMAS ===

export const insertContactSubmissionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().min(1, "Email é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  petName: z.string().min(1, "Nome do pet é obrigatório"),
  animalType: z.string().min(1, "Tipo de animal é obrigatório"),
  petAge: z.string().min(1, "Idade do pet é obrigatória"),
  planInterest: z.string().min(1, "Interesse no plano é obrigatório"),
  message: z.string().optional(),
});

export const insertPlanSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  features: z.array(z.string()).min(1, "Features são obrigatórias"),
  image: z.string().min(1, "Imagem é obrigatória"),
  isActive: z.boolean().default(true),
  buttonText: z.string().default("Contratar Plano"),
  displayOrder: z.number().default(0),
  planType: z.enum(["with_waiting_period", "without_waiting_period"]).default("with_waiting_period"),
  billingFrequency: z.enum(["monthly", "annual"]).default("monthly"),
  basePrice: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Valor base deve ser positivo ou zero",
  }).default("0.00"),
  installmentPrice: z.string().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Valor parcelado deve ser positivo ou zero",
  }).optional(),
  installmentCount: z.number().min(1, "Número de parcelas deve ser positivo").optional(),
  perPetBilling: z.boolean().default(false),
  petDiscounts: z.record(z.number()).default({}),
  paymentDescription: z.string().optional(),
  availablePaymentMethods: z.array(z.enum(["cartao", "pix"])).default(["cartao", "pix"]),
  availableBillingOptions: z.array(z.enum(["monthly", "annual"])).default(["monthly"]),
  annualPrice: z.string().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Valor anual deve ser positivo ou zero",
  }).optional(),
  annualInstallmentPrice: z.string().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
    message: "Valor anual parcelado deve ser positivo ou zero",
  }).optional(),
  annualInstallmentCount: z.number().min(1, "Número de parcelas anuais deve ser positivo").default(12),
});

const baseNetworkUnitSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  services: z.array(z.string()).min(1, "Serviços são obrigatórios"),
  imageUrl: z.string().min(1, "Imagem é obrigatória"),
  isActive: z.boolean().default(true),
  whatsapp: z.string().optional().refine((val) => {
    if (!val) return true;
    const digitsOnly = val.replace(/\D/g, "");
    return digitsOnly.length === 11;
  }, {
    message: "WhatsApp deve conter exatamente 11 dígitos",
  }),
  googleMapsUrl: z.string().optional().refine((val) => !val || val.trim() === "" || /^https?:\/\/.+/.test(val), {
    message: "URL do Google Maps deve ser válida",
  }),
  imageData: z.string().optional(),
  urlSlug: z.string().optional(),
});

// TypeScript type for NetworkUnit (moved to bottom with other type exports)

export const insertNetworkUnitSchema = baseNetworkUnitSchema;

export const updateNetworkUnitSchema = baseNetworkUnitSchema.partial();

export const insertFaqItemSchema = z.object({
  question: z.string()
    .min(1, "Pergunta é obrigatória")
    .max(500, "Pergunta deve ter no máximo 500 caracteres"),
  answer: z.string()
    .min(1, "Resposta é obrigatória")
    .max(2000, "Resposta deve ter no máximo 2000 caracteres"),
  displayOrder: z.number().min(0, "Ordem de exibição é obrigatória"),
  isActive: z.boolean().default(true),
});

export const insertSiteSettingsSchema = z.object({
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  instagramUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  cnpj: z.string().optional(),
  businessHours: z.string().optional(),
  ourStory: z.string().optional(),
  privacyPolicy: z.string().optional(),
  termsOfUse: z.string().optional(),
  address: z.string().optional(),
  mainImage: z.string().optional(),
  networkImage: z.string().optional(),
  aboutImage: z.string().optional(),
  mainImageUrl: z.string().optional(),
  networkImageUrl: z.string().optional(),
  aboutImageUrl: z.string().optional(),
  cores: z.record(z.string()).optional(),
});

export const insertChatSettingsSchema = z.object({
  welcomeMessage: z.string().optional(),
  placeholderText: z.string().optional(),
  chatTitle: z.string().optional(),
  buttonIcon: z.string().optional(),
  botIcon: z.string().optional(),
  userIcon: z.string().optional(),
  botIconUrl: z.string().optional(),
  userIconUrl: z.string().optional(),
  chatPosition: z.string().optional(),
  chatSize: z.string().optional(),
  isEnabled: z.boolean().optional(),
});

export const insertClientSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(), // Optional for Admin compatibility
  phone: z.string().min(1, "Telefone é obrigatório"),
  cpf: z.string().optional(), // Made optional for both systems
  cep: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
});

// Schema específico para admin com CPF obrigatório
export const insertClientAdminSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(), // Optional for Admin compatibility
  phone: z.string().min(1, "Telefone é obrigatório"),
  cpf: z.string().min(1, "CPF é obrigatório"), // Obrigatório no admin
  cep: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
});

// Schema específico para Step 2 do checkout (sem CPF obrigatório)
export const insertClientSchemaStep2 = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(), // Optional - sistema usa email + CPF para login
  phone: z.string().min(1, "Telefone é obrigatório"),
  cpf: z.string().optional(), // CPF opcional no Step 2
  cep: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
});

export const clientLoginSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Seller schemas
export const insertSellerSchema = z.object({
  fullName: z.string().min(1, "Nome completo é obrigatório"),
  cpf: z.string().min(11, "CPF é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  phone: z.string().min(1, "Celular é obrigatório"),
  cep: z.string().min(1, "CEP é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  district: z.string().min(1, "Bairro é obrigatório"),
  state: z.string().min(1, "Estado é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatório"),
  pixKey: z.string().min(1, "Chave PIX é obrigatória"),
  pixKeyType: z.enum(["cpf", "cnpj", "email", "phone", "random"], { required_error: "Tipo de chave PIX é obrigatório" }),
  bank: z.string().min(1, "Banco é obrigatório"),
  accountNumber: z.string().min(1, "Conta corrente é obrigatória"),
  fullNameForPayment: z.string().min(1, "Nome completo para pagamento é obrigatório"),
  agency: z.string().min(1, "Agência é obrigatória"),
  cpaPercentage: z.string().or(z.number()).refine((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return !isNaN(num) && num >= 0 && num <= 100;
  }, { message: "CPA deve ser entre 0 e 100%" }),
  recurringCommissionPercentage: z.string().or(z.number()).refine((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return !isNaN(num) && num >= 0 && num <= 100;
  }, { message: "Comissão recorrente deve ser entre 0 e 100%" }),
});

export const updateSellerSchema = insertSellerSchema.partial();

export const sellerLoginSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z.string().min(1, "CPF é obrigatório"), // Password is CPF
});

export const insertSellerPaymentSchema = z.object({
  sellerId: z.string().min(1, "ID do vendedor é obrigatório"),
  amount: z.string().or(z.number()).transform((val) => {
    if (typeof val === 'number') {
      if (isNaN(val) || val <= 0) {
        throw new Error("Valor deve ser maior que zero");
      }
      return val;
    }
    
    // Reject negative values explicitly
    if (val.includes('-')) {
      throw new Error("Valor não pode ser negativo");
    }
    
    // Remove all non-numeric except dots and commas
    let cleanVal = val.trim().replace(/[^\d.,]/g, '');
    
    // If there's a comma, it's Brazilian format (dots=thousands, comma=decimal)
    // If no comma, dots are decimals (standard HTML/JS format)
    if (cleanVal.includes(',')) {
      // Brazilian format: remove dots (thousands), replace comma with dot (decimal)
      cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
    }
    // Otherwise keep dots as decimals
    
    const num = parseFloat(cleanVal || '0');
    if (isNaN(num) || num <= 0) {
      throw new Error("Valor deve ser maior que zero");
    }
    return num;
  }),
  paymentDate: z.date().optional(),
  description: z.string().optional(),
  createdBy: z.string().min(1, "Criador é obrigatório"),
});

export const updateUserSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});

// === NEW TABLE VALIDATION SCHEMAS ===

export const insertPetSchema = z.object({
  clientId: z.string().min(1, "ID do cliente é obrigatório"),
  name: z.string().min(1, "Nome do pet é obrigatório"),
  species: z.string().min(1, "Espécie é obrigatória"),
  breed: z.string().optional(),
  birthDate: z.date().optional(),
  age: z.string().optional(),
  sex: z.enum(["Macho", "Fêmea"], { required_error: "Sexo do pet é obrigatório" }),
  castrated: z.boolean().optional().default(false),
  color: z.string().optional(),
  weight: z.string().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
    message: "Peso deve ser um número positivo",
  }).optional(),
  microchip: z.string().optional(),
  previousDiseases: z.string().optional(),
  surgeries: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: z.string().optional(),
  hereditaryConditions: z.string().optional(),
  vaccineData: z.array(z.object({
    vaccine: z.string(),
    date: z.string(),
  })).default([]),
  parasiteTreatments: z.string().optional(),
  planId: z.string().optional(),
  image: z.string().optional(),
  imageUrl: z.string().optional(),
});

// Update pet schema
export const updatePetSchema = insertPetSchema.partial().extend({
  id: z.string().optional(),
});

// === MISSING UNIPET VALIDATION SCHEMAS ===

export const insertContractSchema = z.object({
  clientId: z.string().min(1, "ID do cliente é obrigatório"),
  planId: z.string().min(1, "ID do plano é obrigatório"),
  petId: z.string().min(1, "ID do pet é obrigatório"),
  contractNumber: z.string().min(1, "Número do contrato é obrigatório"),
  status: z.enum(["active", "inactive", "suspended", "cancelled"]).default("active"),
  startDate: z.date().default(() => new Date()),
  endDate: z.date().optional(),
  billingPeriod: z.enum(["monthly", "annual"]).default("monthly"),
  monthlyAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Valor mensal deve ser positivo",
  }),
  annualAmount: z.string().optional(),
  paymentMethod: z.string().min(1, "Método de pagamento é obrigatório"),
  cieloPaymentId: z.string().optional(),
  hasCoparticipation: z.boolean().default(false),
});

export const insertPlanProcedureSchema = z.object({
  planId: z.string().min(1, "ID do plano é obrigatório"),
  procedureId: z.string().min(1, "ID do procedimento é obrigatório"),
  isIncluded: z.boolean().default(true),
  coparticipationOverride: z.string().optional(),
  coverageOverride: z.number().min(0).max(100).optional(),
  waitingPeriodDays: z.number().min(0).default(0),
});

export const insertServiceHistorySchema = z.object({
  contractId: z.string().min(1, "ID do contrato é obrigatório"),
  petId: z.string().min(1, "ID do pet é obrigatório"),
  procedureId: z.string().min(1, "ID do procedimento é obrigatório"),
  networkUnitId: z.string().optional(),
  serviceDate: z.date(),
  status: z.enum(["requested", "approved", "in_progress", "completed", "rejected"]).default("requested"),
  totalAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Valor total deve ser positivo",
  }),
  coparticipationAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Valor de coparticipação deve ser positivo ou zero",
  }).default("0.00"),
  coverageAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Valor de cobertura deve ser positivo ou zero",
  }),
  observations: z.string().optional(),
  veterinarianName: z.string().optional(),
  invoiceNumber: z.string().optional(),
});

export const insertProtocolSchema = z.object({
  clientId: z.string().min(1, "ID do cliente é obrigatório"),
  contractId: z.string().optional(),
  protocolNumber: z.string().min(1, "Número do protocolo é obrigatório"),
  type: z.enum(["complaint", "information", "plan_change", "cancellation", "emergency", "other"]),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).default("open"),
  subject: z.string().min(1, "Assunto é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  priority: z.string().default("medium"),
  assignedTo: z.string().optional(),
  resolution: z.string().optional(),
  resolvedAt: z.date().optional(),
});

export const insertSatisfactionSurveySchema = z.object({
  clientId: z.string().min(1, "ID do cliente é obrigatório"),
  contractId: z.string().optional(),
  serviceHistoryId: z.string().optional(),
  protocolId: z.string().optional(),
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
  suggestions: z.string().optional(),
  wouldRecommend: z.boolean().optional(),
});

export const insertSpeciesSchema = z.object({
  name: z.string().min(1, "Nome da espécie é obrigatório"),
  displayOrder: z.number().min(0, "Ordem de exibição deve ser positiva").default(0),
  isActive: z.boolean().default(true),
});

// === PAYMENT VALIDATION SCHEMAS ===

// Credit Card Payment Schema
export const creditCardPaymentSchema = z.object({
  customer: z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
    email: z.string().email("Email inválido").max(100),
    identity: z.string().optional(),
    identityType: z.enum(['CPF', 'CNPJ']).optional(),
    birthdate: z.string().optional(),
    address: z.object({
      street: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres").max(100),
      number: z.string().min(1, "Número é obrigatório").max(10),
      complement: z.string().max(50).optional(),
      zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
      city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres").max(50),
      state: z.string().length(2, "Estado deve ter 2 caracteres"),
      country: z.string().default("BRA")
    }).optional()
  }),
  payment: z.object({
    type: z.literal('CreditCard'),
    amount: z.number().int().min(100, "Valor mínimo é R$ 1,00 (100 centavos)"),
    installments: z.number().int().min(1).max(12),
    capture: z.boolean().default(false),
    creditCard: z.object({
      cardNumber: z.string().regex(/^\d{16}$/, "Número do cartão deve ter 16 dígitos"),
      holder: z.string().min(2, "Nome do portador deve ter pelo menos 2 caracteres").max(50),
      expirationDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{4}$/, "Data de expiração deve estar no formato MM/AAAA"),
      securityCode: z.string().regex(/^\d{3,4}$/, "Código de segurança deve ter 3 ou 4 dígitos"),
      brand: z.enum(['Visa', 'Master', 'Amex', 'Elo', 'Aura', 'JCB', 'Diners', 'Discover'])
    })
  })
});

// PIX Payment Schema
export const pixPaymentSchema = z.object({
  customer: z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
    email: z.string().email("Email inválido").max(100),
    identity: z.string().optional(),
    identityType: z.enum(['CPF', 'CNPJ']).optional()
  }),
  payment: z.object({
    type: z.literal('Pix'),
    amount: z.number().int().min(100, "Valor mínimo é R$ 1,00 (100 centavos)")
  })
});

// Checkout Process Schema
export const checkoutProcessSchema = z.object({
  clientData: insertClientSchemaStep2,
  petData: insertPetSchema.omit({ clientId: true }),
  planId: z.string().min(1, "ID do plano é obrigatório"),
  paymentMethod: z.enum(["cartao", "pix"]),
  billingPeriod: z.enum(["monthly", "annual"]).default("monthly")
});

// Payment Capture Schema
export const paymentCaptureSchema = z.object({
  amount: z.number().int().min(100, "Valor mínimo é R$ 1,00 (100 centavos)").optional()
});

// Payment Cancel Schema
export const paymentCancelSchema = z.object({
  amount: z.number().int().min(100, "Valor mínimo é R$ 1,00 (100 centavos)").optional()
});

// Webhook Notification Schema
export const cieloWebhookSchema = z.object({
  PaymentId: z.string().uuid("PaymentId deve ser um UUID válido"),
  ChangeType: z.number().int().min(1).max(3, "ChangeType deve ser 1, 2 ou 3"),
  ClientOrderId: z.string().optional(),
  RequestId: z.string().optional()
});

// === Admin-specific schemas ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true }).extend({
  permissions: z.array(z.string()).default([])
});
export const insertProcedureSchema = createInsertSchema(procedures).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProcedurePlanSchema = createInsertSchema(procedurePlans).omit({ id: true, createdAt: true, isIncluded: true, displayOrder: true });
export const insertRulesSettingsSchema = createInsertSchema(rulesSettings).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  fixedPercentage: z.union([
    z.string().transform(val => val === "" ? undefined : parseFloat(val)),
    z.number()
  ]).optional().refine(val => val === undefined || (val >= 0 && val <= 100), "Porcentagem deve estar entre 0 e 100"),
  coparticipationPercentage: z.union([
    z.string().transform(val => val === "" ? undefined : parseFloat(val)),
    z.number()
  ]).optional().refine(val => val === undefined || (val >= 0 && val <= 100), "Porcentagem deve estar entre 0 e 100"),
  defaultCpaPercentage: z.union([
    z.string().transform(val => val === "" ? undefined : parseFloat(val)),
    z.number()
  ]).optional().refine(val => val === undefined || (val >= 0 && val <= 100), "Porcentagem CPA deve estar entre 0 e 100"),
  defaultRecurringCommissionPercentage: z.union([
    z.string().transform(val => val === "" ? undefined : parseFloat(val)),
    z.number()
  ]).optional().refine(val => val === undefined || (val >= 0 && val <= 100), "Porcentagem de comissão recorrente deve estar entre 0 e 100")
});
export const insertGuideSchema = createInsertSchema(guides).omit({ id: true, createdAt: true, updatedAt: true });

// Credential update schema for network units
export const updateNetworkUnitCredentialsSchema = z.object({
  login: z.string().min(3, "Login deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

// Admin login schema
export const adminLoginSchema = z.object({
  login: z.string().min(1, "Login é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória")
});

// === TYPE EXPORTS ===

// Core shared types
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;
export type NetworkUnit = typeof networkUnits.$inferSelect;
export type InsertNetworkUnit = typeof networkUnits.$inferInsert;
export type FaqItem = typeof faqItems.$inferSelect;
export type InsertFaqItem = typeof faqItems.$inferInsert;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type InsertSiteSettings = typeof siteSettings.$inferInsert;
export type ChatSettings = typeof chatSettings.$inferSelect;
export type InsertChatSettings = typeof chatSettings.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type ClientLogin = z.infer<typeof clientLoginSchema>;
export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = typeof sellers.$inferInsert;
export type SellerLogin = z.infer<typeof sellerLoginSchema>;
export type SellerPayment = typeof sellerPayments.$inferSelect;
export type InsertSellerPayment = z.infer<typeof insertSellerPaymentSchema>;
export type Species = typeof species.$inferSelect;
export type InsertSpecies = typeof species.$inferInsert;
export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;
export type Procedure = typeof procedures.$inferSelect;
export type InsertProcedure = typeof procedures.$inferInsert;
export type PlanProcedure = typeof planProcedures.$inferSelect;
export type InsertPlanProcedure = typeof planProcedures.$inferInsert;
export type ProcedurePlan = typeof procedurePlans.$inferSelect;
export type InsertProcedurePlan = typeof procedurePlans.$inferInsert;
export type ServiceHistory = typeof serviceHistory.$inferSelect;
export type InsertServiceHistory = typeof serviceHistory.$inferInsert;
export type Protocol = typeof protocols.$inferSelect;
export type InsertProtocol = typeof protocols.$inferInsert;
export type Guide = typeof guides.$inferSelect;
export type InsertGuide = typeof guides.$inferInsert;
export type ProcedureUsage = typeof procedureUsage.$inferSelect;
export type InsertProcedureUsage = typeof procedureUsage.$inferInsert;
export type SatisfactionSurvey = typeof satisfactionSurveys.$inferSelect;
export type InsertSatisfactionSurvey = typeof satisfactionSurveys.$inferInsert;
export type PaymentReceipt = typeof paymentReceipts.$inferSelect;
export type InsertPaymentReceipt = typeof paymentReceipts.$inferInsert;

// Payment and workflow schema types
export type CreditCardPayment = z.infer<typeof creditCardPaymentSchema>;
export type PixPayment = z.infer<typeof pixPaymentSchema>;
export type CheckoutProcess = z.infer<typeof checkoutProcessSchema>;
export type PaymentCapture = z.infer<typeof paymentCaptureSchema>;
export type PaymentCancel = z.infer<typeof paymentCancelSchema>;
export type CieloWebhook = z.infer<typeof cieloWebhookSchema>;
export type UpdatePet = z.infer<typeof updatePetSchema>;

// Admin-specific types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type RulesSettings = typeof rulesSettings.$inferSelect;
export type InsertRulesSettings = typeof rulesSettings.$inferInsert;

// Network unit with credential status for admin
export type NetworkUnitWithCredentialStatus = NetworkUnit & {
  hasCredentials: boolean;
};

// Credential update type
export type UpdateNetworkUnitCredentials = z.infer<typeof updateNetworkUnitCredentialsSchema>;

// Coupon types
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// Coupon schemas
export const insertCouponSchema = createInsertSchema(coupons).extend({
  code: z.string().min(3, "Código deve ter pelo menos 3 caracteres").max(50),
  value: z.string().or(z.number()),
  usageLimit: z.number().int().positive().nullable().optional(),
});

export const updateCouponSchema = insertCouponSchema.partial();