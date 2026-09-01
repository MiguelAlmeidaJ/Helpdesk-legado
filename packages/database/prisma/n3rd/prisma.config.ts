import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/n3rd/schema.prisma',
  migrations: {
    path: 'prisma/n3rd/migrations',
  },
  datasource: {
    url: process.env.N3RD_DATABASE_URL ?? '',
  },
});
