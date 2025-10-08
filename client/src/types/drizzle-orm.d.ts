declare module 'drizzle-orm' {
  export const sql: any;
  export function eq(column: any, value: any): any;
  export function and(...conditions: any[]): any;
  export function or(...conditions: any[]): any;
  export function desc(column: any): any;
  export function asc(column: any): any;
  export function count(column?: any): any;
  export function sum(column: any): any;
  export function avg(column: any): any;
  export function min(column: any): any;
  export function max(column: any): any;
  export function like(column: any, pattern: string): any;
  export function ilike(column: any, pattern: string): any;
  export function inArray(column: any, values: any[]): any;
  export function isNull(column: any): any;
  export function isNotNull(column: any): any;
  export function exists(query: any): any;
  export function notExists(query: any): any;
  export function between(column: any, min: any, max: any): any;
  export function gt(column: any, value: any): any;
  export function gte(column: any, value: any): any;
  export function lt(column: any, value: any): any;
  export function lte(column: any, value: any): any;
  export function ne(column: any, value: any): any;
  export function not(condition: any): any;
  export type SQL = any;
  export type SQLWrapper = any;
  export type InferSelectModel<T> = any;
  export type InferInsertModel<T> = any;
}

declare module 'drizzle-orm/pg-core' {
  export function pgTable(name: string, columns: Record<string, any>): any;
  export function text(name?: string): any;
  export function varchar(name?: string, config?: { length?: number }): any;
  export function timestamp(name?: string, config?: any): any;
  export function integer(name?: string): any;
  export function boolean(name?: string): any;
  export function json(name?: string): any;
  export function pgEnum(name: string, values: readonly string[]): any;
  export function serial(name?: string): any;
  export function bigserial(name?: string): any;
  export function decimal(name?: string, config?: any): any;
  export function numeric(name?: string, config?: any): any;
  export function real(name?: string): any;
  export function doublePrecision(name?: string): any;
  export function smallint(name?: string): any;
  export function bigint(name?: string, config?: any): any;
  export function date(name?: string, config?: any): any;
  export function time(name?: string, config?: any): any;
  export function interval(name?: string, config?: any): any;
  export function uuid(name?: string): any;
  export function char(name?: string, config?: { length?: number }): any;
  export function inet(name?: string): any;
  export function cidr(name?: string): any;
  export function macaddr(name?: string): any;
  export function macaddr8(name?: string): any;
  export function point(name?: string): any;
  export function line(name?: string): any;
  export function lseg(name?: string): any;
  export function box(name?: string): any;
  export function path(name?: string): any;
  export function polygon(name?: string): any;
  export function circle(name?: string): any;
  export type PgTable = any;
  export type PgColumn = any;
  export type PgTableWithColumns<T extends Record<string, any>> = any;
}

declare module 'drizzle-orm/node-postgres' {
  export function drizzle(client: any, config?: any): any;
  export type NodePgDatabase = any;
}

declare module 'drizzle-orm/postgres-js' {
  export function drizzle(client: any, config?: any): any;
  export type PostgresJsDatabase = any;
}