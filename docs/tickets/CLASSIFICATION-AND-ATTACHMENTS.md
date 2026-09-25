# Classification and attachments

## Classification

The migrated editor covers the same fields as legacy `atd_edt`:

- type;
- category;
- subcategory;
- item;
- level;
- priority;
- service form;
- opening description.

Catalog endpoints:

```text
GET /api/tickets/catalogs/classification
GET /api/tickets/catalogs/classification/subcategories?categoryId=...
GET /api/tickets/catalogs/classification/items?subcategoryId=...
PATCH /api/tickets/:id/classification
```

The write requires `tickets.read` + `tickets.classify`, validates the
category/subcategory/item hierarchy and records a type-9 interaction for every
changed field inside the same database transaction.

## Attachments

Endpoints:

```text
GET    /api/tickets/:id/attachments
GET    /api/tickets/:id/attachments/:kind/:attachmentId/content
POST   /api/tickets/:id/attachments
DELETE /api/tickets/:id/attachments/:kind/:attachmentId
```

Read uses `tickets.read`. Upload/delete deliberately use `tickets.execute`
scope because the hardened PHP endpoints authorize attachment mutation through
the same owner-or-manager execution rule.

The list preserves both legacy stores:

- `documentos`: files under the shared `uploads/` directory;
- `imagens`: historical JPEG BLOBs.

New files are stored only in `documentos`, even when the MIME type is an
image. This avoids creating new BLOB attachments while keeping old images
readable and deletable.

The upload limit is 25 MB. The physical storage root defaults to `<repo>/uploads`
and may be overridden with `TICKET_UPLOAD_DIR`.

Upload creates interaction type 12. Delete creates interaction type 11.
Document paths are resolved beneath the configured upload root to prevent path
traversal.
