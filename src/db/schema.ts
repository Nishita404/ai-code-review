import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const review = pgTable(
  "review",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    language: text("language").notNull(),
    score: integer("score").notNull(),
    summary: text("summary").notNull(),
    reviewJson: jsonb("review_json").notNull(),
    starred: boolean("starred").default(false).notNull(),
    tags: text("tags").array().default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("review_userId_idx").on(table.userId)],
);

export const reviewProject = pgTable(
  "review_project",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    projectName: text("project_name").notNull(),
    fileCount: integer("file_count").notNull(),
    languageStats: jsonb("language_stats").$type<Record<string, number>>().notNull(),
    overallScore: integer("overall_score").notNull(),
    summary: text("summary").notNull(),
    reviewJson: jsonb("review_json").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("review_project_userId_idx").on(table.userId)],
);

export const reviewProjectFile = pgTable(
  "review_project_file",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => reviewProject.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    language: text("language").notNull(),
    score: integer("score").notNull(),
    reviewJson: jsonb("review_json").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("review_project_file_projectId_idx").on(table.projectId)],
);

export const repoAnalysis = pgTable(
  "repo_analysis",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    projectName: text("project_name").notNull(),
    fileCount: integer("file_count").notNull(),
    totalLoc: integer("total_loc").notNull(),
    languageStats: jsonb("language_stats").$type<Record<string, number>>().notNull(),
    securityScore: integer("security_score").notNull(),
    maintainabilityScore: integer("maintainability_score").notNull(),
    performanceScore: integer("performance_score").notNull(),
    architectureScore: integer("architecture_score").notNull(),
    metricsJson: jsonb("metrics_json").notNull(),
    architectureJson: jsonb("architecture_json").notNull(),
    securityJson: jsonb("security_json").notNull(),
    performanceJson: jsonb("performance_json").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("repo_analysis_userId_idx").on(table.userId)],
);

export const githubAccounts = pgTable(
  "github_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    githubId: text("github_id").notNull().unique(),
    username: text("username").notNull(),
    avatar: text("avatar"),
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("github_accounts_userId_idx").on(table.userId),
    index("github_accounts_githubId_idx").on(table.githubId),
  ],
);

export const githubRepositories = pgTable(
  "github_repositories",
  {
    id: text("id").primaryKey(),
    githubAccountId: text("github_account_id")
      .notNull()
      .references(() => githubAccounts.id, { onDelete: "cascade" }),
    repoId: text("repo_id").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    isPrivate: boolean("is_private").notNull(),
    htmlUrl: text("html_url").notNull(),
    description: text("description"),
    language: text("language"),
    stars: integer("stars").default(0).notNull(),
    cloneLocation: text("clone_location"),
    lastClonedAt: timestamp("last_cloned_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("github_repositories_githubAccountId_idx").on(table.githubAccountId),
  ],
);

export const prReviews = pgTable(
  "pr_reviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    repoId: text("repo_id")
      .notNull()
      .references(() => githubRepositories.id, { onDelete: "cascade" }),
    prNumber: integer("pr_number").notNull(),
    prTitle: text("pr_title").notNull(),
    prAuthor: text("pr_author").notNull(),
    prBranch: text("pr_branch").notNull(),
    changedFiles: jsonb("changed_files").$type<string[]>().notNull(),
    score: integer("score"),
    summary: text("summary"),
    reviewJson: jsonb("review_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("pr_reviews_userId_idx").on(table.userId),
    index("pr_reviews_repoId_idx").on(table.repoId),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  reviews: many(review),
  reviewProjects: many(reviewProject),
  repoAnalyses: many(repoAnalysis),
  githubAccount: one(githubAccounts, {
    fields: [user.id],
    references: [githubAccounts.userId],
  }),
  prReviews: many(prReviews),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const reviewRelations = relations(review, ({ one }) => ({
  user: one(user, {
    fields: [review.userId],
    references: [user.id],
  }),
}));

export const reviewProjectRelations = relations(reviewProject, ({ one, many }) => ({
  user: one(user, {
    fields: [reviewProject.userId],
    references: [user.id],
  }),
  files: many(reviewProjectFile),
}));

export const reviewProjectFileRelations = relations(reviewProjectFile, ({ one }) => ({
  project: one(reviewProject, {
    fields: [reviewProjectFile.projectId],
    references: [reviewProject.id],
  }),
}));

export const repoAnalysisRelations = relations(repoAnalysis, ({ one }) => ({
  user: one(user, {
    fields: [repoAnalysis.userId],
    references: [user.id],
  }),
}));

export const githubAccountsRelations = relations(githubAccounts, ({ one, many }) => ({
  user: one(user, {
    fields: [githubAccounts.userId],
    references: [user.id],
  }),
  repositories: many(githubRepositories),
}));

export const githubRepositoriesRelations = relations(githubRepositories, ({ one, many }) => ({
  githubAccount: one(githubAccounts, {
    fields: [githubRepositories.githubAccountId],
    references: [githubAccounts.id],
  }),
  prReviews: many(prReviews),
}));

export const prReviewsRelations = relations(prReviews, ({ one }) => ({
  user: one(user, {
    fields: [prReviews.userId],
    references: [user.id],
  }),
  repository: one(githubRepositories, {
    fields: [prReviews.repoId],
    references: [githubRepositories.id],
  }),
}));
