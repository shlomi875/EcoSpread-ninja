CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"brand" text,
	"model" text,
	"size" text,
	"date" text,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text,
	"phone" text,
	"email" text,
	"about" text,
	"target_price_offset" numeric DEFAULT '-5',
	"brands" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"model_number" text,
	"category" text,
	"sub_category" text,
	"gender" text DEFAULT 'unisex',
	"price" text,
	"zap_price" text,
	"zap_link" text,
	"target_price" text,
	"min_price" text,
	"description" text,
	"short_description" text,
	"manufacturer" text,
	"warranty" text,
	"delivery_time" text,
	"payments" text,
	"movement" text,
	"diameter" text,
	"material" text,
	"water_resistance" text,
	"glass" text,
	"filters" text[] DEFAULT '{}',
	"seo_keywords" text[] DEFAULT '{}',
	"images" text[] DEFAULT '{}',
	"status" text DEFAULT 'draft',
	"last_updated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
