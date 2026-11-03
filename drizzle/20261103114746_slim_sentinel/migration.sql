CREATE TABLE "templates" (
	"id" text PRIMARY KEY,
	"ownerId" text NOT NULL,
	"ownerName" text NOT NULL,
	"name" text NOT NULL,
	"mode" text DEFAULT 'fixed' NOT NULL,
	"goals" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "templates_owner_idx" ON "templates" ("ownerId","updatedAt");