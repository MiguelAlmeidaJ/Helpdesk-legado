import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/nivel3/schema.prisma',
  migrations: {
    path: 'prisma/nivel3/migrations',
  },
  datasource: {
    url: process.env.NIVEL3_DATABASE_URL ?? '',
  },
});
