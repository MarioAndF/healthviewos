# HealthView OS Data Model

HealthView OS should accept health information from many sources, organize what
it understands, and create useful visual health views without losing the
original evidence.

This document records the current product and engineering policy for
representing health information. It is intentionally not a complete database
schema, interoperability specification, or clinical rules engine.

See `PRIVACY.md` for storage, local-first behavior, remote processing, and
privacy constraints.

## Core Rule

> Preserve the original, normalize what HealthView OS understands, map
> terminology when possible, and derive new information without losing
> provenance.

HealthView OS data has four layers:

```text
Original sources
-> Normalized HealthView OS data
-> Terminology mappings
-> Derived HealthView OS data
```

Every important record, view, warning sign, summary, and recommendation should
be traceable back through those layers.

## Original Sources

HealthView OS must preserve imported information as it was received.

Examples include:

- FHIR JSON.
- PDFs and clinical documents.
- DICOM images and imaging studies.
- Lab CSV files and portal exports.
- Emails and attachments.
- Wearable and device exports.
- Insurance explanations of benefits and claims.
- Provider, pharmacy, and appointment records.
- User notes and manual entries.

Original sources may be incomplete, duplicated, inconsistent, poorly labeled, or
unstructured. HealthView OS should support that reality rather than requiring
every source to conform to a single standard.

Rules:

- Do not overwrite or discard original source data.
- Store original files as files where practical.
- Record where each source came from and when it was imported or updated.
- Treat original sources as evidence, even when HealthView OS cannot fully
  understand them.
- Existing user-selected source folders are read-only inputs unless the user
  explicitly asks HealthView OS to modify them.

## Normalized HealthView OS Data

HealthView OS should convert the information it understands into a simpler,
person-centered internal model.

The internal model should support the product areas and user experience,
including:

- Health.
- Services.
- Records.
- Billing.
- Settings.
- Assistant or chat workflows.

The internal model should be informed by healthcare standards, especially FHIR
and US Core, but it should not be a raw copy of FHIR.

Examples:

```text
FHIR Observation
Lab report PDF
Wearable measurement
User-entered measurement
-> HealthView OS Observation
```

```text
FHIR MedicationRequest
Prescription PDF
Pharmacy export
User-entered medication
-> HealthView OS Medication
```

Rules:

- Normalize only what HealthView OS can represent with reasonable confidence.
- Preserve uncertainty, conflicting information, and missing values.
- Do not force source information into a misleading normalized structure.
- Allow multiple sources to support or contradict the same normalized item.
- Every normalized item must reference its supporting original source, import,
  or user input.

## Initial V1 Entities

The first durable model should stay small and provenance-heavy.

Recommended V1 entities:

- `Person`: the person whose health data is represented.
- `Source`: an external origin such as a provider, lab, insurer, device, app, or
  manually entered source.
- `SourceArtifact`: an original file, payload, document, image, email, export,
  or manual entry.
- `Observation`: labs, vitals, wearable readings, measurements, and other
  observed values.
- `Medication`: active and historical medications, prescriptions, and user
  entries.
- `Condition`: imported diagnoses, problems, or user-entered health history,
  with uncertainty preserved.
- `Allergy`: allergies and intolerances.
- `Immunization`: vaccines and immunization records.
- `Encounter`: visits, appointments, admissions, procedures, telehealth
  sessions, and related care events.
- `Provider`: clinicians, pharmacies, facilities, labs, organizations, and care
  services.
- `Coverage`: insurance coverage, plan details, member identifiers, and
  eligibility metadata.
- `Claim`: claims, explanations of benefits, authorizations, bills, balances,
  and payment events.
- `Message`: user notes, assistant messages, provider-message metadata, or care
  communication records when explicitly imported.
- `TerminologyMapping`: mappings from source codes/text to standard and
  HealthView OS concepts.
- `DerivedInsight`: timelines, trends, warning signs, summaries, health map
  signals, recommendations, and AI-generated explanations.
- `ProvenanceEvent`: import, normalization, mapping, derivation, edit, export,
  permission, and remote-processing history.

These are product-level concepts. The database schema may split or combine them
as needed, but the product should preserve these responsibilities.

## FHIR And Interoperability

FHIR is an interoperability boundary, not the HealthView OS database schema.

Rules:

- Use FHIR resources and profiles when importing from or exporting to systems
  that support FHIR.
- Preserve original FHIR resources as source artifacts.
- Use FHIR concepts and relationships as guidance when designing the internal
  model.
- Keep FHIR-specific adapters separate from the normalized HealthView OS model.
- Do not require non-FHIR sources to be converted into complete FHIR resources
  before HealthView OS can use them.

Other standards should remain in their appropriate boundaries:

- Preserve DICOM for medical imaging.
- Preserve documents, reports, and emails as source artifacts.
- Support payer and billing standards through dedicated adapters when needed.

## Terminology Mappings

Terminology mappings help HealthView OS understand when different sources refer
to the same or related concepts.

Examples include:

- SNOMED CT for clinical concepts.
- LOINC for labs, measurements, observations, and documents.
- RxNorm for medications.
- ICD-10 for diagnoses and classification.
- CPT and HCPCS for procedures and services.
- UCUM for measurement units.

HealthView OS should preserve:

- Original source code and display text.
- Original source code system, when known.
- Normalized standard codes.
- HealthView OS concept identifier.
- Mapping confidence.
- Mapping method.
- Human correction status, when applicable.

Example:

```text
Original code or text: "A1C"
LOINC code: 4548-4
HealthView OS concept: hemoglobin_a1c
Confidence: high
```

Rules:

- Do not discard local or source-specific codes after mapping them.
- Do not treat uncertain mappings as confirmed facts.
- Support more than one terminology mapping when useful.
- Terminology mappings must be traceable to the source data they describe.

## Derived HealthView OS Data

HealthView OS may create product-specific information from normalized data.

Examples include:

- Visual health map signals.
- Timelines.
- Trends.
- Summaries.
- Relationships.
- Goals and progress.
- Warning signs.
- Recommendations.
- AI-generated explanations.

Derived information is not original source data.

Rules:

- Every derived item must reference the normalized data and original sources
  that support it.
- Derived items must identify how and when they were created.
- Derived items should record confidence, uncertainty, and limitations when
  relevant.
- Derived items must be replaceable or reproducible as HealthView OS improves.
- Users should be able to inspect the evidence behind important derived
  information.
- Derived health warnings must be framed as informational signals unless
  reviewed and approved for a regulated clinical use case.

## Provenance

Provenance connects every layer of HealthView OS data.

HealthView OS should be able to answer:

- Where did this information come from?
- Was it imported, entered by the user, normalized, mapped, edited, or derived?
- When was it created or updated?
- Which original source supports it?
- Which normalized record supports it?
- Which transformation, model, rule, or process created it?
- What confidence or uncertainty is associated with it?
- Was it sent to a remote processor?
- Was it exported or shared?

Provenance must be preserved across import, normalization, terminology mapping,
derivation, edit, export, backup, sync, and remote processing.

## Storage Responsibilities

Storage must follow `PRIVACY.md`.

### Browser Prototype Storage

In the web prototype, durable data may live in browser-local storage such as
IndexedDB, OPFS, Cache Storage, or SQLite/WASM backed by browser storage.

Browser-local storage may be used for:

- Synthetic demo records.
- User-imported prototype data.
- Draft records and unsaved edits.
- Local UI state.
- Local derived views.

Browser-local storage must not be presented as a guaranteed permanent
production vault. The product should provide export and reset controls before
real user data is encouraged.

### User-Visible Local Vault

The intended production vault is:

```text
HealthView OS vault/
  files/              # Readable source artifacts, notes, reports, and exports
  healthview.sqlite   # Normalized data, mappings, provenance, and derived data
  cache/              # Disposable and reproducible artifacts
```

Rules:

- SQLite should reference original files rather than embedding large source
  artifacts where practical.
- Vault files should remain normal readable files in a user-visible location.
- Original source artifacts must not be treated as disposable cache data.
- Derived cache artifacts may be deleted and regenerated.
- Existing user-selected source folders are read-only inputs unless the user
  explicitly asks HealthView OS to modify them.

## Client State And UI Control

Client state libraries such as Zustand may be used for app and session
orchestration, but not as unstructured durable health-data storage.

Appropriate Zustand responsibilities:

- Active app destination.
- Selected person.
- Selected record, panel, tab, or filter.
- Editor mode and unsaved drafts.
- Assistant-visible UI context.
- Temporary client-side view state.

Zustand must not become the health record database. Durable changes must flow
through typed data-access actions, schema validation, and persistence adapters.

The assistant should inspect selectors and invoke typed UI or workspace actions.
It should not mutate arbitrary store fields directly.

## Schema And Migrations

HealthView OS should treat schema versioning as a V1 requirement.

Rules:

- Every durable database should record a schema version.
- Migrations must be explicit, reversible where practical, and testable.
- Source artifacts should remain readable even when normalized schema changes.
- Derived data should be recomputable or clearly marked with the model/rule
  version that created it.
- Importers should record their version and mapping behavior.

## Confidence, Conflict, And Correction

Health data is often messy. The model must support that.

HealthView OS should represent:

- Conflicting records from different sources.
- Superseded records.
- Uncertain mappings.
- Partial dates.
- Missing values.
- User corrections.
- Human-reviewed versus machine-derived fields.
- Source reliability and import confidence where useful.

The product should not hide conflict by silently picking one answer when the
evidence is ambiguous.

## Remote Processing Data

If a remote processor is used for OCR, extraction, AI analysis, terminology
mapping, provider communication, or payer communication, HealthView OS should
record a provenance event with:

- User-requested action.
- Data scope sent, described at a safe level.
- Processor or integration used.
- Time of request.
- Whether data was redacted or deidentified.
- Retention/deletion expectation when known.
- Result artifact or derived record created.

Do not store full remote prompts, payloads, or responses in logs or analytics.
If the user chooses to store AI outputs in the vault, they are derived data and
must link to evidence.

## Open Questions

- Which storage backend should power the first web prototype: IndexedDB, OPFS,
  SQLite/WASM, or a simpler temporary adapter?
- Which V1 entities should be implemented first for the Health dashboard?
- How should duplicate records from multiple sources be detected?
- How should conflicting or superseded information appear in the UI?
- Which FHIR resources and US Core profiles should be supported first?
- Which terminology services and code systems should be available locally?
- How should mapping confidence and human corrections be represented?
- Which derived items should be persisted, and which should be generated on
  demand?
- How should browser-local data migrate into the future user-visible local
  vault?
