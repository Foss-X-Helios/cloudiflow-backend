import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const orgs = pgTable('orgs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').references(() => orgs.id),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').references(() => orgs.id).notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cloudAccounts = pgTable('cloud_accounts', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').references(() => orgs.id).notNull(),
  provider: text('provider').notNull(), // 'aws' | 'gcp' | 'azure'
  encryptedCredentials: text('encrypted_credentials').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const deployments = pgTable('deployments', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'running' | 'success' | 'failed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
