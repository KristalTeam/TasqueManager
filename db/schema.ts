import * as p from "drizzle-orm/pg-core";

export const userRoles = p.pgTable("UserRoles", {
  user_id: p.bigint({ mode: 'bigint' }).primaryKey().notNull(),
  role_id: p.bigint({ mode: 'bigint' }).notNull()
});
