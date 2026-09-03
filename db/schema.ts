/**
 * Devworld — Database Schema (Drizzle ORM / PostgreSQL)
 * V1 scope: users, profiles, marketplace, proposals, agreements,
 * milestones, payments, messaging, reviews, disputes, admin.
 *
 * Design principles:
 * - Agreements/milestones/payments are append-only where money is involved
 *   (never overwrite state — insert new rows) so there's always an audit trail.
 * - Status fields use enums to keep the lifecycle explicit and queryable.
 * - Skills are a structured entity (not free text) so search/matching works.
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  numeric,
  integer,
  timestamp,
  boolean,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// ENUMS — the lifecycle states from the Phase 1 blueprint
// ---------------------------------------------------------------------------

export const availabilityEnum = pgEnum("availability", [
  "available",
  "limited",
  "unavailable",
]);

export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "admin",
  "hiring_manager",
  "member",
]);

export const budgetTypeEnum = pgEnum("budget_type", [
  "fixed",
  "milestone",
  "hourly",
]);

export const projectVisibilityEnum = pgEnum("project_visibility", [
  "public",
  "invite_only",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "published",
  "in_discussion",
  "proposals_open",
  "developer_selected",
  "agreement_pending",
  "funded",
  "active",
  "delivered",
  "under_review",
  "completed",
  "cancelled",
  "disputed",
  "on_hold",
  "expired",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "draft",
  "submitted",
  "viewed",
  "shortlisted",
  "accepted",
  "withdrawn",
  "declined",
  "expired",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
]);

export const agreementStatusEnum = pgEnum("agreement_status", [
  "draft",
  "pending_acceptance",
  "active",
  "amended",
  "completed",
  "cancelled",
  "disputed",
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "pending",
  "funded",
  "in_progress",
  "submitted",
  "approved",
  "paid",
  "disputed",
]);

export const changeRequestStatusEnum = pgEnum("change_request_status", [
  "pending",
  "approved",
  "declined",
]);

export const paymentTypeEnum = pgEnum("payment_type", [
  "milestone_funding",
  "milestone_payout",
  "hourly_invoice",
  "platform_fee",
  "refund",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "under_review",
  "resolved",
  "closed",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "open",
  "reviewed",
  "dismissed",
  "actioned",
]);

// ---------------------------------------------------------------------------
// USERS & AUTH
// ---------------------------------------------------------------------------
// One user account can hold a developer profile, a client profile, and/or
// company memberships simultaneously — role is not fixed at signup.

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  authProviderId: varchar("auth_provider_id", { length: 255 }), // Clerk/Auth.js external id
  isSuspended: boolean("is_suspended").notNull().default(false),
  // Not self-service — granted directly in the database. See modules/admin.
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
}));

// ---------------------------------------------------------------------------
// SKILLS — structured, reusable entities (not free text)
// ---------------------------------------------------------------------------

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }), // language | framework | tool | specialization
}, (t) => ({
  nameIdx: uniqueIndex("skills_name_idx").on(t.name),
}));

// ---------------------------------------------------------------------------
// DEVELOPER PROFILES
// ---------------------------------------------------------------------------

export const developerProfiles = pgTable("developer_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  headline: varchar("headline", { length: 150 }),
  bio: text("bio"),
  location: varchar("location", { length: 150 }),
  timezone: varchar("timezone", { length: 50 }),
  yearsExperience: integer("years_experience"),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  projectStartingPrice: numeric("project_starting_price", { precision: 10, scale: 2 }),
  availability: availabilityEnum("availability").default("available"),
  githubUsername: varchar("github_username", { length: 100 }),
  gitlabUsername: varchar("gitlab_username", { length: 100 }),
  linkedinUrl: text("linkedin_url"),
  websiteUrl: text("website_url"),
  // Stripe Connect (Express) — set once the developer completes onboarding.
  // See modules/payments/README.md build order item 1.
  stripeAccountId: varchar("stripe_account_id", { length: 255 }),
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: uniqueIndex("dev_profiles_user_idx").on(t.userId),
}));

export const developerSkills = pgTable("developer_skills", {
  developerProfileId: uuid("developer_profile_id").notNull()
    .references(() => developerProfiles.id, { onDelete: "cascade" }),
  skillId: uuid("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
  yearsExperience: integer("years_experience"),
}, (t) => ({
  pk: primaryKey({ columns: [t.developerProfileId, t.skillId] }),
}));

export const portfolioItems = pgTable("portfolio_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  developerProfileId: uuid("developer_profile_id").notNull()
    .references(() => developerProfiles.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description"),
  role: varchar("role", { length: 150 }),
  technologies: jsonb("technologies").$type<string[]>().default([]),
  externalUrl: text("external_url"),
  repoUrl: text("repo_url"),
  imageUrls: jsonb("image_urls").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  devIdx: index("portfolio_dev_idx").on(t.developerProfileId),
}));

// ---------------------------------------------------------------------------
// CLIENT & COMPANY PROFILES
// ---------------------------------------------------------------------------

export const clientProfiles = pgTable("client_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 150 }),
  bio: text("bio"),
  location: varchar("location", { length: 150 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: uniqueIndex("client_profiles_user_idx").on(t.userId),
}));

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
  website: text("website"),
  industry: varchar("industry", { length: 100 }),
  size: varchar("size", { length: 50 }),
  location: varchar("location", { length: 150 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companyMemberships = pgTable("company_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: membershipRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniquePair: uniqueIndex("company_membership_unique").on(t.companyId, t.userId),
}));

// ---------------------------------------------------------------------------
// PROJECT MARKETPLACE
// ---------------------------------------------------------------------------

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientUserId: uuid("client_user_id").notNull().references(() => users.id),
  companyId: uuid("company_id").references(() => companies.id), // nullable — individual clients have none
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }),
  budgetType: budgetTypeEnum("budget_type").notNull(),
  budgetMin: numeric("budget_min", { precision: 10, scale: 2 }),
  budgetMax: numeric("budget_max", { precision: 10, scale: 2 }),
  timelineDays: integer("timeline_days"),
  visibility: projectVisibilityEnum("visibility").notNull().default("public"),
  status: projectStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  statusIdx: index("projects_status_idx").on(t.status),
  categoryIdx: index("projects_category_idx").on(t.category),
  clientIdx: index("projects_client_idx").on(t.clientUserId),
}));

export const projectSkills = pgTable("project_skills", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  skillId: uuid("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.skillId] }),
}));

export const projectAttachments = pgTable("project_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  filename: varchar("filename", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// PROPOSALS & HIRING
// ---------------------------------------------------------------------------

export const proposals = pgTable("proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  developerProfileId: uuid("developer_profile_id").notNull()
    .references(() => developerProfiles.id, { onDelete: "cascade" }),
  introduction: text("introduction"),
  proposedAmount: numeric("proposed_amount", { precision: 10, scale: 2 }),
  proposedRateType: budgetTypeEnum("proposed_rate_type").notNull(),
  estimatedTimelineDays: integer("estimated_timeline_days"),
  status: proposalStatusEnum("status").notNull().default("submitted"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  projectIdx: index("proposals_project_idx").on(t.projectId),
  uniqueActive: uniqueIndex("proposals_unique_active").on(t.projectId, t.developerProfileId),
}));

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  developerProfileId: uuid("developer_profile_id").notNull()
    .references(() => developerProfiles.id, { onDelete: "cascade" }),
  invitedByUserId: uuid("invited_by_user_id").notNull().references(() => users.id),
  message: text("message"),
  status: invitationStatusEnum("status").notNull().default("sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// AGREEMENTS, MILESTONES & CHANGE REQUESTS
// ---------------------------------------------------------------------------

export const agreements = pgTable("agreements", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  proposalId: uuid("proposal_id").references(() => proposals.id),
  clientUserId: uuid("client_user_id").notNull().references(() => users.id),
  developerProfileId: uuid("developer_profile_id").notNull()
    .references(() => developerProfiles.id),
  scopeDescription: text("scope_description").notNull(),
  deliverables: text("deliverables"),
  budgetType: budgetTypeEnum("budget_type").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }), // for fixed-price
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),   // for hourly
  startDate: timestamp("start_date"),
  targetCompletionDate: timestamp("target_completion_date"),
  status: agreementStatusEnum("status").notNull().default("draft"),
  clientAcceptedAt: timestamp("client_accepted_at"),
  developerAcceptedAt: timestamp("developer_accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  projectIdx: index("agreements_project_idx").on(t.projectId),
  statusIdx: index("agreements_status_idx").on(t.status),
}));

export const milestones = pgTable("milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  agreementId: uuid("agreement_id").notNull().references(() => agreements.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  dueDate: timestamp("due_date"),
  status: milestoneStatusEnum("status").notNull().default("pending"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeTransferId: varchar("stripe_transfer_id", { length: 255 }),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  agreementIdx: index("milestones_agreement_idx").on(t.agreementId),
}));

export const changeRequests = pgTable("change_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  agreementId: uuid("agreement_id").notNull().references(() => agreements.id, { onDelete: "cascade" }),
  requestedByUserId: uuid("requested_by_user_id").notNull().references(() => users.id),
  description: text("description").notNull(),
  amountDelta: numeric("amount_delta", { precision: 10, scale: 2 }),
  timelineDeltaDays: integer("timeline_delta_days"),
  status: changeRequestStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// PAYMENTS — append-only ledger. Never mutate a row's meaning after the fact;
// insert a new row (e.g. a refund) that references the original.
// ---------------------------------------------------------------------------

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  agreementId: uuid("agreement_id").references(() => agreements.id),
  milestoneId: uuid("milestone_id").references(() => milestones.id),
  type: paymentTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  platformFeeAmount: numeric("platform_fee_amount", { precision: 10, scale: 2 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeTransferId: varchar("stripe_transfer_id", { length: 255 }),
  status: paymentStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  agreementIdx: index("payments_agreement_idx").on(t.agreementId),
  milestoneIdx: index("payments_milestone_idx").on(t.milestoneId),
}));

// ---------------------------------------------------------------------------
// MESSAGING
// ---------------------------------------------------------------------------

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id),
  agreementId: uuid("agreement_id").references(() => agreements.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationParticipants = pgTable("conversation_participants", {
  conversationId: uuid("conversation_id").notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.conversationId, t.userId] }),
}));

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderUserId: uuid("sender_user_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  attachmentUrls: jsonb("attachment_urls").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  conversationIdx: index("messages_conversation_idx").on(t.conversationId),
}));

// ---------------------------------------------------------------------------
// REVIEWS
// ---------------------------------------------------------------------------

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  agreementId: uuid("agreement_id").notNull().references(() => agreements.id, { onDelete: "cascade" }),
  reviewerUserId: uuid("reviewer_user_id").notNull().references(() => users.id),
  revieweeUserId: uuid("reviewee_user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqueReview: uniqueIndex("reviews_unique").on(t.agreementId, t.reviewerUserId),
}));

// ---------------------------------------------------------------------------
// DISPUTES, REPORTS & ADMIN
// ---------------------------------------------------------------------------

export const disputes = pgTable("disputes", {
  id: uuid("id").defaultRandom().primaryKey(),
  agreementId: uuid("agreement_id").notNull().references(() => agreements.id),
  milestoneId: uuid("milestone_id").references(() => milestones.id),
  openedByUserId: uuid("opened_by_user_id").notNull().references(() => users.id),
  reason: varchar("reason", { length: 150 }).notNull(),
  description: text("description"),
  status: disputeStatusEnum("status").notNull().default("open"),
  resolution: text("resolution"),
  resolvedByAdminId: uuid("resolved_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterUserId: uuid("reporter_user_id").notNull().references(() => users.id),
  targetType: varchar("target_type", { length: 50 }).notNull(), // 'user' | 'project' | 'review' | 'message'
  targetId: uuid("target_id").notNull(),
  reason: varchar("reason", { length: 150 }).notNull(),
  status: reportStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminActions = pgTable("admin_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminUserId: uuid("admin_user_id").notNull().references(() => users.id),
  actionType: varchar("action_type", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: uuid("target_id").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// FAVORITES — DW-503. Same polymorphic targetType/targetId pattern as
// `reports`, rather than two separate tables for saved developers vs
// saved projects.
// ---------------------------------------------------------------------------

export const favorites = pgTable("favorites", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: varchar("target_type", { length: 50 }).notNull(), // 'developer_profile' | 'project'
  targetId: uuid("target_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniqueFavorite: uniqueIndex("favorites_unique").on(t.userId, t.targetType, t.targetId),
}));

// ---------------------------------------------------------------------------
// RELATIONS — wires up Drizzle's relational query API for the core entities
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  developerProfile: one(developerProfiles, {
    fields: [users.id],
    references: [developerProfiles.userId],
  }),
  clientProfile: one(clientProfiles, {
    fields: [users.id],
    references: [clientProfiles.userId],
  }),
  companyMemberships: many(companyMemberships),
  projectsPosted: many(projects),
}));

export const developerProfilesRelations = relations(developerProfiles, ({ one, many }) => ({
  user: one(users, { fields: [developerProfiles.userId], references: [users.id] }),
  skills: many(developerSkills),
  portfolioItems: many(portfolioItems),
  proposals: many(proposals),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(users, { fields: [projects.clientUserId], references: [users.id] }),
  company: one(companies, { fields: [projects.companyId], references: [companies.id] }),
  requiredSkills: many(projectSkills),
  proposals: many(proposals),
  invitations: many(invitations),
  agreements: many(agreements),
}));

export const agreementsRelations = relations(agreements, ({ one, many }) => ({
  project: one(projects, { fields: [agreements.projectId], references: [projects.id] }),
  developer: one(developerProfiles, {
    fields: [agreements.developerProfileId],
    references: [developerProfiles.id],
  }),
  milestones: many(milestones),
  changeRequests: many(changeRequests),
  payments: many(payments),
  reviews: many(reviews),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  agreement: one(agreements, { fields: [milestones.agreementId], references: [agreements.id] }),
  payments: many(payments),
}));
