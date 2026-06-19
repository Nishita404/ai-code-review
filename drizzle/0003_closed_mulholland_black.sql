CREATE TABLE "pr_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"repo_id" text NOT NULL,
	"pr_number" integer NOT NULL,
	"pr_title" text NOT NULL,
	"pr_author" text NOT NULL,
	"pr_branch" text NOT NULL,
	"changed_files" jsonb NOT NULL,
	"score" integer,
	"summary" text,
	"review_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pr_reviews" ADD CONSTRAINT "pr_reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_reviews" ADD CONSTRAINT "pr_reviews_repo_id_github_repositories_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."github_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pr_reviews_userId_idx" ON "pr_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pr_reviews_repoId_idx" ON "pr_reviews" USING btree ("repo_id");