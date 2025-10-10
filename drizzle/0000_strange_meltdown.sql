DO $$ BEGIN
 CREATE TYPE "billing_period_enum" AS ENUM('monthly', 'annual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "contract_status_enum" AS ENUM('active', 'inactive', 'suspended', 'cancelled', 'pending');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "coupon_type_enum" AS ENUM('percentage', 'fixed_value');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "payment_method_enum" AS ENUM('cartao', 'pix');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "plan_billing_frequency_enum" AS ENUM('monthly', 'annual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "plan_type_enum" AS ENUM('with_waiting_period', 'without_waiting_period');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "protocol_status_enum" AS ENUM('open', 'in_progress', 'resolved', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "protocol_type_enum" AS ENUM('complaint', 'information', 'plan_change', 'cancellation', 'emergency', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "receipt_status_enum" AS ENUM('generated', 'downloaded', 'sent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "service_status_enum" AS ENUM('requested', 'approved', 'in_progress', 'completed', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "species_enum" AS ENUM('dog', 'cat', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"welcome_message" text DEFAULT 'Olá! Como posso te ajudar hoje?' NOT NULL,
	"placeholder_text" text DEFAULT 'Digite sua mensagem...' NOT NULL,
	"chat_title" text DEFAULT 'Atendimento Virtual' NOT NULL,
	"button_icon" text DEFAULT 'MessageCircle' NOT NULL,
	"bot_icon" "bytea",
	"user_icon" "bytea",
	"bot_icon_url" text,
	"user_icon_url" text,
	"chat_position" text DEFAULT 'bottom-right' NOT NULL,
	"chat_size" text DEFAULT 'md' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"cpf" text,
	"cep" text,
	"address" text,
	"number" text,
	"complement" text,
	"district" text,
	"state" text,
	"city" text,
	"cpf_hash" text,
	"image" text,
	"image_url" text,
	"created_by_unit_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"city" text NOT NULL,
	"pet_name" text NOT NULL,
	"animal_type" text NOT NULL,
	"pet_age" text NOT NULL,
	"plan_interest" text NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contract_installments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"installment_number" integer NOT NULL,
	"due_date" timestamp NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"cielo_payment_id" varchar,
	"payment_receipt_id" varchar,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contracts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"pet_id" varchar NOT NULL,
	"contract_number" text NOT NULL,
	"status" "contract_status_enum" DEFAULT 'active' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"billing_period" "billing_period_enum" DEFAULT 'monthly' NOT NULL,
	"monthly_amount" numeric(10, 2) NOT NULL,
	"annual_amount" numeric(10, 2),
	"payment_method" text NOT NULL,
	"cielo_payment_id" text,
	"has_coparticipation" boolean DEFAULT false NOT NULL,
	"proof_of_sale" text,
	"authorization_code" text,
	"tid" text,
	"received_date" timestamp,
	"return_code" text,
	"return_message" text,
	"pix_qr_code" text,
	"pix_code" text,
	"cielo_card_token" varchar,
	"card_brand" varchar,
	"card_last_digits" varchar(4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"type" "coupon_type_enum" NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faq_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"pet_id" varchar NOT NULL,
	"network_unit_id" varchar,
	"procedure" text NOT NULL,
	"procedure_notes" text,
	"general_notes" text,
	"value" numeric,
	"status" text DEFAULT 'open',
	"unit_status" text DEFAULT 'open',
	"created_by_unit_id" varchar,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "network_units" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"cidade" text NOT NULL,
	"phone" text NOT NULL,
	"services" text[] NOT NULL,
	"image_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"whatsapp" text,
	"google_maps_url" text,
	"image_data" text,
	"url_slug" text,
	"login" text,
	"senha_hash" text,
	CONSTRAINT "network_units_url_slug_unique" UNIQUE("url_slug"),
	CONSTRAINT "network_units_login_unique" UNIQUE("login")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_receipts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar,
	"cielo_payment_id" text NOT NULL,
	"receipt_number" text NOT NULL,
	"payment_amount" numeric(10, 2) NOT NULL,
	"payment_date" timestamp NOT NULL,
	"payment_method" text NOT NULL,
	"status" "receipt_status_enum" DEFAULT 'generated' NOT NULL,
	"pdf_file_name" text NOT NULL,
	"pdf_object_key" text NOT NULL,
	"proof_of_sale" text,
	"authorization_code" text,
	"tid" text,
	"return_code" text,
	"return_message" text,
	"client_name" text NOT NULL,
	"client_email" text NOT NULL,
	"pet_name" text,
	"plan_name" text,
	"pets_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_receipts_cielo_payment_id_unique" UNIQUE("cielo_payment_id"),
	CONSTRAINT "payment_receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"breed" text,
	"birth_date" timestamp,
	"age" text,
	"sex" text NOT NULL,
	"castrated" boolean DEFAULT false,
	"color" text,
	"weight" numeric(5, 2),
	"microchip" text,
	"previous_diseases" text,
	"surgeries" text,
	"allergies" text,
	"current_medications" text,
	"hereditary_conditions" text,
	"vaccine_data" json DEFAULT '[]'::json,
	"last_checkup" timestamp,
	"parasite_treatments" text,
	"plan_id" varchar,
	"image" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_unit_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_procedures" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"procedure_id" varchar NOT NULL,
	"price" integer DEFAULT 0,
	"is_included" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"coparticipacao" integer DEFAULT 0,
	"carencia" text,
	"limites_anuais" text,
	"pay_value" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"features" text[] NOT NULL,
	"image" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"button_text" text DEFAULT 'Contratar Plano' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"plan_type" "plan_type_enum" DEFAULT 'with_waiting_period' NOT NULL,
	"billing_frequency" "plan_billing_frequency_enum" DEFAULT 'monthly' NOT NULL,
	"base_price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"installment_price" numeric(10, 2),
	"installment_count" integer,
	"per_pet_billing" boolean DEFAULT false NOT NULL,
	"pet_discounts" json DEFAULT '{}'::json,
	"payment_description" text,
	"available_payment_methods" json DEFAULT '["cartao", "pix"]'::json NOT NULL,
	"available_billing_options" json DEFAULT '["monthly"]'::json NOT NULL,
	"annual_price" numeric(10, 2),
	"annual_installment_price" numeric(10, 2),
	"annual_installment_count" integer DEFAULT 12,
	CONSTRAINT "plans_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "procedure_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"procedure_id" varchar NOT NULL,
	"price" integer DEFAULT 0,
	"pay_value" integer DEFAULT 0,
	"coparticipacao" integer DEFAULT 0,
	"carencia" text,
	"limites_anuais" text,
	"is_included" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "procedure_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pet_id" varchar NOT NULL,
	"procedure_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"year" integer NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "procedures" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "protocols" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"contract_id" varchar,
	"protocol_number" text NOT NULL,
	"type" "protocol_type_enum" NOT NULL,
	"status" "protocol_status_enum" DEFAULT 'open' NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assigned_to" text,
	"resolution" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "protocols_protocol_number_unique" UNIQUE("protocol_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rules_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixed_percentage" integer DEFAULT 0,
	"coparticipation_percentage" integer DEFAULT 10,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "satisfaction_surveys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"contract_id" varchar,
	"service_history_id" varchar,
	"protocol_id" varchar,
	"rating" integer NOT NULL,
	"feedback" text,
	"suggestions" text,
	"would_recommend" boolean,
	"responded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"pet_id" varchar NOT NULL,
	"procedure_id" varchar NOT NULL,
	"network_unit_id" varchar,
	"service_date" timestamp NOT NULL,
	"status" "service_status_enum" DEFAULT 'requested' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"coparticipation_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"coverage_amount" numeric(10, 2) NOT NULL,
	"observations" text,
	"veterinarian_name" text,
	"invoice_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp" text,
	"email" text,
	"phone" text,
	"instagram_url" text,
	"facebook_url" text,
	"linkedin_url" text,
	"youtube_url" text,
	"cnpj" text,
	"business_hours" text,
	"our_story" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"privacy_policy" text,
	"terms_of_use" text,
	"address" text,
	"main_image" "bytea",
	"network_image" "bytea",
	"about_image" "bytea",
	"main_image_url" text,
	"network_image_url" text,
	"about_image_url" text,
	"cores" json DEFAULT '{}'::json
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "species" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"permissions" json DEFAULT '[]'::json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_installments" ADD CONSTRAINT "contract_installments_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_installments" ADD CONSTRAINT "contract_installments_payment_receipt_id_payment_receipts_id_fk" FOREIGN KEY ("payment_receipt_id") REFERENCES "payment_receipts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guides" ADD CONSTRAINT "guides_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guides" ADD CONSTRAINT "guides_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guides" ADD CONSTRAINT "guides_network_unit_id_network_units_id_fk" FOREIGN KEY ("network_unit_id") REFERENCES "network_units"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pets" ADD CONSTRAINT "pets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pets" ADD CONSTRAINT "pets_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_procedures" ADD CONSTRAINT "plan_procedures_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_procedures" ADD CONSTRAINT "plan_procedures_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "procedure_plans" ADD CONSTRAINT "procedure_plans_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "procedure_plans" ADD CONSTRAINT "procedure_plans_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "procedure_usage" ADD CONSTRAINT "procedure_usage_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "procedure_usage" ADD CONSTRAINT "procedure_usage_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "procedure_usage" ADD CONSTRAINT "procedure_usage_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "protocols" ADD CONSTRAINT "protocols_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "protocols" ADD CONSTRAINT "protocols_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_service_history_id_service_history_id_fk" FOREIGN KEY ("service_history_id") REFERENCES "service_history"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "satisfaction_surveys" ADD CONSTRAINT "satisfaction_surveys_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "protocols"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_history" ADD CONSTRAINT "service_history_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_history" ADD CONSTRAINT "service_history_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_history" ADD CONSTRAINT "service_history_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_history" ADD CONSTRAINT "service_history_network_unit_id_network_units_id_fk" FOREIGN KEY ("network_unit_id") REFERENCES "network_units"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
