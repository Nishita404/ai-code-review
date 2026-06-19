ALTER TABLE "github_repositories" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "stars" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "clone_location" text;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD COLUMN "last_cloned_at" timestamp;