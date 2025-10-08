import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";

/**
 * SECURE SCHEMA - SEM DADOS PESSOAIS
 * 
 * Este schema foi projetado para não armazenar informações pessoais sensíveis.
 * Todos os dados pessoais são obtidos via APIs externas (Cielo) ou armazenados localmente.
 * Armazenamos apenas:
 * - IDs de referência externa
 * - Metadados não-sensíveis
 * - Estados e status
 */

// === TABELAS SEGURAS (SEM DADOS PESSOAIS) ===

// Tabela de sessões de checkout (temporária)
export const checkoutSessions = pgTable("checkout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: text("session_token").notNull().unique(),
  planId: varchar("plan_id").notNull(),
  step: integer("step").default(1).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  metadata: jsonb("metadata"), // dados não-sensíveis do processo
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabela de contratos ativos (apenas referências)
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  numeroContrato: varchar("numero_contrato").notNull().unique(),
  cieloCustomerId: text("cielo_customer_id"), // ID do cliente na Cielo
  planId: varchar("plan_id").notNull(),
  status: text("status").default("active").notNull(),
  valorMensal: integer("valor_mensal").notNull(), // em centavos
  dataInicio: timestamp("data_inicio").notNull(),
  dataFim: timestamp("data_fim"),
  diaVencimento: integer("dia_vencimento").default(10).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabela de transações (apenas metadados)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => contracts.id),
  cieloTransactionId: text("cielo_transaction_id"), // ID da transação na Cielo
  paymentMethod: text("payment_method").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").default("pending").notNull(),
  installments: integer("installments").default(1).notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabela de logs de auditoria seguros (sem dados pessoais)
export const secureAuditLogs = pgTable("secure_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalUserId: text("external_user_id"), // hash ou ID externo
  userType: text("user_type").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: varchar("resource_id"),
  ipAddressHash: text("ip_address_hash"), // hash do IP, não IP real
  success: boolean("success").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabela de tokens de sessão do cliente
export const customerSessions = pgTable("customer_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionToken: text("session_token").notNull().unique(),
  cieloCustomerId: text("cielo_customer_id"),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === SCHEMAS DE VALIDAÇÃO ===

export const createCheckoutSessionSchema = z.object({
  planId: z.string().min(1, "ID do plano é obrigatório"),
  sessionToken: z.string().min(1, "Token da sessão é obrigatório"),
  metadata: z.record(z.any()).optional(),
});

export const createContractSchema = z.object({
  numeroContrato: z.string().min(1, "Número do contrato é obrigatório"),
  cieloCustomerId: z.string().optional(),
  planId: z.string().min(1, "ID do plano é obrigatório"),
  valorMensal: z.number().min(1, "Valor mensal deve ser positivo"),
  dataInicio: z.string().min(1, "Data de início é obrigatória"),
  diaVencimento: z.number().min(1).max(31).default(10),
});

export const createTransactionSchema = z.object({
  contractId: z.string().min(1, "ID do contrato é obrigatório"),
  cieloTransactionId: z.string().optional(),
  paymentMethod: z.string().min(1, "Método de pagamento é obrigatório"),
  amount: z.number().min(1, "Valor deve ser positivo"),
  installments: z.number().min(1).max(12).default(1),
});

export const createSecureAuditLogSchema = z.object({
  externalUserId: z.string().optional(),
  userType: z.enum(["customer"]),
  action: z.enum(["create", "read", "update", "delete"]),
  resource: z.string().min(1, "Recurso é obrigatório"),
  resourceId: z.string().optional(),
  ipAddressHash: z.string().optional(),
  success: z.boolean().default(true),
});

export const createCustomerSessionSchema = z.object({
  sessionToken: z.string().min(1, "Token da sessão é obrigatório"),
  cieloCustomerId: z.string().optional(),
  expiresAt: z.string().min(1, "Data de expiração é obrigatória"),
});

// === TIPOS ===

export type CheckoutSession = typeof checkoutSessions.$inferSelect;
export type InsertCheckoutSession = z.infer<typeof createCheckoutSessionSchema>;

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof createContractSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof createTransactionSchema>;

export type SecureAuditLog = typeof secureAuditLogs.$inferSelect;
export type InsertSecureAuditLog = z.infer<typeof createSecureAuditLogSchema>;

export type CustomerSession = typeof customerSessions.$inferSelect;
export type InsertCustomerSession = z.infer<typeof createCustomerSessionSchema>;

// === UTILITÁRIOS DE SEGURANÇA ===

export function hashIP(ip: string): string {
  // Função para hash do IP (implementar com crypto)
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

export function generateSessionToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

export function generateContractNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `UNI${date}${random}`;
}