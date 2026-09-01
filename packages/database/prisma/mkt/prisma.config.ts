import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/mkt/schema.prisma',
  migrations: {
    path: 'prisma/mkt/migrations',
  },
  datasource: {
    url: process.env.MKT_DATABASE_URL ?? '',
  },
});
