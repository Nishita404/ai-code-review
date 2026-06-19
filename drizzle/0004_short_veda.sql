CREATE TABLE "pr_comment_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pr_review_id" text NOT NULL,
	"github_comment_id" text,
	"file_path" text NOT NULL,
	"line_number" integer,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pr_comment_history" ADD CONSTRAINT "pr_comment_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pr_comment_history" ADD CONSTRAINT "pr_comment_history_pr_review_id_pr_reviews_id_fk" FOREIGN KEY ("pr_review_id") REFERENCES "public"."pr_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pr_comment_history_userId_idx" ON "pr_comment_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pr_comment_history_prReviewId_idx" ON "pr_comment_history" USING btree ("pr_review_id");