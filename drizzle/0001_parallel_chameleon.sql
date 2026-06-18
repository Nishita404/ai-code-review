CREATE TABLE "github_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"github_id" text NOT NULL,
	"username" text NOT NULL,
	"avatar" text,
	"encrypted_access_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_accounts_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
CREATE TABLE "github_repositories" (
	"id" text PRIMARY KEY NOT NULL,
	"github_account_id" text NOT NULL,
	"repo_id" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"is_private" boolean NOT NULL,
	"html_url" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repo_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"project_name" text NOT NULL,
	"file_count" integer NOT NULL,
	"total_loc" integer NOT NULL,
	"language_stats" jsonb NOT NULL,
	"security_score" integer NOT NULL,
	"maintainability_score" integer NOT NULL,
	"performance_score" integer NOT NULL,
	"architecture_score" integer NOT NULL,
	"metrics_json" jsonb NOT NULL,
	"architecture_json" jsonb NOT NULL,
	"security_json" jsonb NOT NULL,
	"performance_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_accounts" ADD CONSTRAINT "github_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD CONSTRAINT "github_repositories_github_account_id_github_accounts_id_fk" FOREIGN KEY ("github_account_id") REFERENCES "public"."github_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo_analysis" ADD CONSTRAINT "repo_analysis_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_accounts_userId_idx" ON "github_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "github_accounts_githubId_idx" ON "github_accounts" USING btree ("github_id");--> statement-breakpoint
CREATE INDEX "github_repositories_githubAccountId_idx" ON "github_repositories" USING btree ("github_account_id");--> statement-breakpoint
CREATE INDEX "repo_analysis_userId_idx" ON "repo_analysis" USING btree ("user_id");