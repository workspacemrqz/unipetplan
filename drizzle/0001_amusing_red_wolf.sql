DO $$ BEGIN
 CREATE TYPE "pix_key_type_enum" AS ENUM('cpf', 'cnpj', 'email', 'phone', 'random');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sellers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"cpf" text NOT NULL,
	"cpf_hash" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"cep" text NOT NULL,
	"address" text NOT NULL,
	"number" text NOT NULL,
	"complement" text,
	"district" text NOT NULL,
	"state" text NOT NULL,
	"city" text NOT NULL,
	"pix_key" text NOT NULL,
	"pix_key_type" "pix_key_type_enum" NOT NULL,
	"bank" text NOT NULL,
	"account_number" text NOT NULL,
	"full_name_for_payment" text NOT NULL,
	"agency" text NOT NULL,
	"cpa_percentage" numeric(5, 2) NOT NULL,
	"recurring_commission_percentage" numeric(5, 2) NOT NULL,
	"whitelabel_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sellers_email_unique" UNIQUE("email"),
	CONSTRAINT "sellers_whitelabel_url_unique" UNIQUE("whitelabel_url")
);
