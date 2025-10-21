import { drizzle } from "drizzle-orm/node-postgres";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as schema from "./schema";

const db = new SQLDatabase("files", {
  migrations: "./files/migrations",
});

export const filesDb = drizzle(db.connectionString, { schema });
