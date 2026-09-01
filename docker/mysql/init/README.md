# Local MySQL bootstrap

The Docker development stack creates three empty databases automatically:

- `nivel3`
- `mkt`
- `n3rd`

To work against a realistic copy of the legacy schema, export the databases from the XAMPP/MySQL environment and place the dump in this directory with a `legacy-` prefix.

Example using `mysqldump`:

```bash
mysqldump -u root -p --databases nivel3 mkt n3rd --routines --triggers --events --result-file=docker/mysql/init/legacy-all.sql
```

If the local XAMPP root user has no password, omit `-p`.

The `legacy-*.sql` files are ignored by Git and must never be committed because they can contain production data.

MySQL executes files from `/docker-entrypoint-initdb.d` only when its data directory is empty. After adding or replacing a dump, recreate the local database volume:

```bash
docker compose down -v
docker compose up
```

After the dump has loaded, introspect it from the application container:

```bash
docker compose exec app pnpm db:pull
docker compose exec app pnpm db:generate
```
