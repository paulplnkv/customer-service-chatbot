import {
  pgTable,
  uuid,
  text,
  varchar,
  date,
  timestamp,
  numeric,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const customers = pgTable("customers", {
  id: uuid().primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
  phone: varchar({ length: 20 }),
  address: text(),
  dateOfBirth: date("date_of_birth"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const policies = pgTable("policies", {
  id: uuid().primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  policyNumber: varchar("policy_number", { length: 50 }).notNull().unique(),
  type: varchar({ length: 50 }).notNull(),
  status: varchar({ length: 20 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  premium: numeric({ precision: 10, scale: 2 }).notNull(),
  deductible: numeric({ precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vehicles = pgTable("vehicles", {
  id: uuid().primaryKey().defaultRandom(),
  policyId: uuid("policy_id")
    .notNull()
    .references(() => policies.id),
  make: varchar({ length: 100 }).notNull(),
  model: varchar({ length: 100 }).notNull(),
  year: integer().notNull(),
  vin: varchar({ length: 17 }).notNull(),
  licensePlate: varchar("license_plate", { length: 20 }),
  color: varchar({ length: 50 }),
});

export const claims = pgTable("claims", {
  id: uuid().primaryKey().defaultRandom(),
  policyId: uuid("policy_id")
    .notNull()
    .references(() => policies.id),
  claimNumber: varchar("claim_number", { length: 50 }).notNull().unique(),
  status: varchar({ length: 20 }).notNull(),
  type: varchar({ length: 50 }).notNull(),
  description: text(),
  amount: numeric({ precision: 10, scale: 2 }),
  dateOfIncident: date("date_of_incident").notNull(),
  dateFiled: date("date_filed").notNull(),
  dateResolved: date("date_resolved"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coverages = pgTable("coverages", {
  id: uuid().primaryKey().defaultRandom(),
  policyId: uuid("policy_id")
    .notNull()
    .references(() => policies.id),
  type: varchar({ length: 50 }).notNull(),
  limitAmount: numeric("limit_amount", { precision: 10, scale: 2 }).notNull(),
  premium: numeric({ precision: 10, scale: 2 }).notNull(),
});

// Relations

export const customersRelations = relations(customers, ({ many }) => ({
  policies: many(policies),
}));

export const policiesRelations = relations(policies, ({ one, many }) => ({
  customer: one(customers, {
    fields: [policies.customerId],
    references: [customers.id],
  }),
  vehicles: many(vehicles),
  claims: many(claims),
  coverages: many(coverages),
}));

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  policy: one(policies, {
    fields: [vehicles.policyId],
    references: [policies.id],
  }),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  policy: one(policies, {
    fields: [claims.policyId],
    references: [policies.id],
  }),
}));

export const coveragesRelations = relations(coverages, ({ one }) => ({
  policy: one(policies, {
    fields: [coverages.policyId],
    references: [policies.id],
  }),
}));
