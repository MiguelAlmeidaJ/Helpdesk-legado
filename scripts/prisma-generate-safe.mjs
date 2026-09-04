import { spawnSync } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const configs = [
  'prisma/nivel3/prisma.config.ts',
  'prisma/n3rd/prisma.config.ts',
];

for (const config of configs) {
  const result = spawnSync(
    pnpm,
    [
      '--filter',
      '@helpdesk/database',
      'exec',
      'prisma',
      'generate',
      '--no-hints',
      `--config=${config}`,
    ],
    {
      stdio: 'inherit',
      shell: false,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
