# HealthView OS Privacy And Data Handling

HealthView OS should make personal health data useful without making the
company the default custodian of that data.

This document records the current product and engineering policy for privacy,
storage, local-first behavior, remote processing, and user control. It is not a
legal compliance certification and must be reviewed with healthcare privacy,
security, and legal experts before production use.

See `DATA.md` for how HealthView OS represents original, normalized, mapped, and
derived health information.

## Principles

- Keep user health data local by default.
- Minimize HealthView OS custody of readable health data.
- Do not make HealthView OS servers the system of record for health records.
- Collect, access, transmit, and retain only the data required for a
  user-requested capability.
- Preserve source evidence and provenance for health information.
- Clearly distinguish original source data from HealthView OS interpretations.
- Deidentify, redact, or summarize remote-processing requests wherever that is
  compatible with the requested task.
- Do not use user health data for advertising, cross-user profiling, or model
  training.
- Do not put health data, prompts, file contents, or remote-processing payloads
  in logs or analytics.

## Product Storage Modes

HealthView OS can support more than one local-first storage mode. The product
must be explicit about which mode is active.

### Browser Prototype Vault

The browser prototype may store local data in browser-managed storage such as
IndexedDB, OPFS, Cache Storage, or SQLite/WASM backed by browser storage.

This mode is useful for hackathon and early web prototypes because data can stay
on the user's device without being uploaded to HealthView OS servers.

However, browser-local storage has important limits:

- It is scoped to the web origin.
- It is not necessarily visible as normal files in a user-selected folder.
- It may be removed when the user clears browser or site data.
- It is subject to browser quota and eviction behavior.
- It may not be portable across browsers or devices without export, backup, or
  sync.
- Hosted web code loaded from the HealthView OS origin can technically access
  the browser-local vault after the user opens the app.

For that reason, browser-local storage is acceptable for prototypes, demos, and
explicitly disclosed local web mode, but it is not the final canonical storage
model for production health records.

Browser prototype requirements:

- No third-party analytics, ads, session replay, or tracking scripts on screens
  that handle health data.
- Use synthetic data for demos, testing, screenshots, and support workflows.
- Provide clear import, export, reset, and delete controls.
- Clearly disclose that browser storage can be lost if browser/site data is
  cleared.
- Treat remote AI or integration calls as explicit user actions requiring
  disclosure before health data leaves the device.

### User-Visible Local Vault

The intended production storage model is a user-controlled HealthView OS vault.
The vault should be a normal local folder where files are readable and portable.

```text
HealthView OS vault/
  files/              # Source documents, images, reports, notes, and exports
  healthview.sqlite   # Structured data, relationships, provenance, messages
  cache/              # Disposable thumbnails and reproducible artifacts
```

- SQLite stores structured health data, metadata, relationships, provenance,
  messages, mappings, and derived health information.
- Files remain normal readable files and are referenced from SQLite.
- Cache data must be disposable and reproducible.
- Users should be able to choose the vault location, with a sensible default.
- Users should be able to browse, copy, back up, share, or delete vault files
  with normal system tools.
- Existing source folders are read-only inputs unless the user explicitly asks
  HealthView OS to modify them.
- Importing data means creating organized files and index entries inside the
  HealthView OS vault. It must not mean moving, renaming, editing, encrypting,
  or reorganizing the user's existing source folders.

A hosted browser app alone may not reliably provide this full vault model across
all browsers. Production should use a native adapter, desktop wrapper, mobile
app, browser extension, local companion service, or another user-approved local
runtime for direct filesystem, SQLite, and secure key storage access.

## Cloud Storage

Cloud services may be used in two different ways.

### Cloud As A Source

The user may connect or select existing files from services such as iCloud
Drive, Google Drive, Dropbox, provider portals, labs, insurers, or exported
archives.

- Request the narrowest practical permissions.
- Prefer explicit file or folder selection over broad account access.
- Do not modify, delete, encrypt, or reorganize original cloud files unless the
  user explicitly requests it.
- Preserve source identity, import time, source URL or handle when available,
  and import history.

### Cloud As Backup Or Sync

The user may optionally use cloud storage to back up or synchronize the
HealthView OS vault.

- Backup and sync must be optional.
- The product must clearly disclose whether the cloud provider receives readable
  health files or encrypted HealthView OS data.
- HealthView OS should support encrypted backup and sync for users who want
  cloud privacy.
- Encryption must not be required for the normal local vault or for explicit
  user-controlled readable exports.
- Recovery, deletion, conflict handling, and loss-of-key behavior must be
  defined before production.
- Cloud backup and sync providers must be reviewed for privacy, security,
  retention, breach notification, and contractual requirements.

## HealthView OS Servers

HealthView OS servers must not become the default system of record for readable
user health data.

Server-side storage should be limited to what is necessary for:

- Accounts and authentication.
- Subscriptions and billing for the app itself.
- Application configuration.
- Minimal operational metadata.
- Encrypted sync metadata when the user opts in.

Do not add durable server-side storage of raw records, original files, extracted
text, health summaries, embeddings, chat history, claims, provider messages, or
other readable health data without explicit product, security, and legal
approval.

## Remote Processing

Remote processing includes hosted AI calls, cloud OCR, terminology services,
provider APIs, payer APIs, communication APIs, and any other service that
receives user health data or metadata.

Remote processing rules:

- Use local processing when practical.
- Send only the minimum data required for the requested task.
- Deidentify, redact, summarize, or scope data wherever compatible with the
  task.
- Do not assume removal of names alone is sufficient deidentification.
- Avoid durable retention of remote inputs and outputs where technically
  possible.
- Do not allow remote processors to train on user health data.
- Prefer processors that provide clear retention, deletion, logging, and
  no-training commitments.
- Clearly disclose when a requested action sends health data or identifying
  information to another party.

Some tasks inherently require identifiable information, such as booking an
appointment, messaging a provider, submitting a claim, requesting records,
filing an appeal, or syncing with a user-selected service. These tasks must use
only the information necessary for the user's request.

## AI And Health Guidance

HealthView OS may produce explanations, summaries, warning signs, or suggested
questions to ask a clinician. These outputs are derived information, not source
records.

- AI outputs must be distinguishable from original records.
- Important outputs should link back to supporting evidence.
- The product must communicate uncertainty, confidence, and limitations when
  relevant.
- Avoid presenting AI output as diagnosis or treatment instructions.
- Escalation language should direct users to appropriate professional or
  emergency care when the product identifies potentially serious symptoms.

## Permissions And User Control

Users must control connections, permissions, sharing, and revocation.

Before production, HealthView OS must define how users can:

- Understand what data HealthView OS has and where it came from.
- View storage mode and vault location.
- Export browser-local data and local-vault data.
- Delete local data.
- Delete or revoke cloud backups and sync copies.
- Disconnect external sources.
- Revoke file, folder, cloud, provider, payer, and device permissions.
- Inspect important derived insights and their evidence.
- Recover from device loss, browser storage loss, sync conflict, or key loss.

Permissions should be visible in Settings and contextually in Records, Sources,
and any import or remote-processing flow.

## Logging, Analytics, And Development

- Do not log health data, file contents, prompts, embeddings, provider messages,
  claim data, or remote-processing payloads.
- Do not send health data to product analytics, crash analytics, session replay,
  or marketing tools.
- Do not include third-party scripts in health-data surfaces unless reviewed and
  explicitly approved.
- Use synthetic data for development, testing, demos, screenshots, and support.
- Do not use production user health data for debugging without an approved,
  auditable process.
- Review third-party SDKs before allowing them into any surface that handles
  health data.

## Security Baseline

The production product should define a security baseline before handling real
health data.

Minimum expectations:

- Strict content security policy for hosted web surfaces.
- No unnecessary third-party JavaScript.
- Secure release process and dependency review.
- Encryption at rest for managed encrypted backups and sync.
- Secure key storage for native apps and local companion services.
- Explicit handling for lost keys and recovery.
- Least-privilege tokens for integrations.
- Token revocation and rotation.
- Audit-friendly records for imports, exports, permission changes, and remote
  processing requests.

## Compliance

Local-first storage and minimized data custody reduce risk, but they do not
remove privacy, security, or healthcare compliance obligations.

Before production, HealthView OS must evaluate applicable requirements,
including:

- HIPAA, when HealthView OS acts as or on behalf of a covered entity, business
  associate, or subcontractor.
- FTC Health Breach Notification Rule for personal health record and health app
  scenarios not covered by HIPAA.
- State consumer health privacy laws.
- Breach notification laws.
- Provider, payer, lab, app store, and cloud-provider contractual obligations.
- FDA and clinical decision support considerations if the product moves beyond
  informational views into diagnosis, treatment, or regulated software
  functions.

This document is a policy draft and must not be represented as a compliance
certification.

## Open Questions

- Which storage mode should ship first after the hackathon: browser-local,
  desktop local vault, mobile local vault, or a local companion service?
- Which browser storage backend should the web prototype use first?
- How should browser-local data be exported into the user-visible vault?
- Which backup and sync modes should be supported first: readable user-managed
  folder backup, encrypted HealthView OS managed backup, or both?
- Which encryption and key management approach should protect encrypted backup
  and sync?
- Which remote AI providers, if any, can meet retention and no-training
  requirements?
- Which health information can be processed locally, and which requires remote
  processing?
- How should family members, caregivers, and delegated users access a person's
  vault?
- What metadata, if any, may HealthView OS retain server-side for reliability
  and support?
