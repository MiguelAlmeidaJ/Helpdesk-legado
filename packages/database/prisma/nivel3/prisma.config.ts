import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: '../../.env' });

export default defineConfig({
  schema: './schema.prisma',
  migrations: {
    path: './migrations',
  },
  datasource: {
    url: process.env.NIVEL3_DATABASE_URL ?? '',
  },
});
