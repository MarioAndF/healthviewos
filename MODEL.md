# HealthView OS Canonical Health Model

HealthView OS's durable health data model is local-first, person-centered, and
evidence-backed. It should be easy for the product to query and explain while
preserving enough standards alignment to import from and export to healthcare
systems.

This document is the north star for schema, persistence, records forms,
imports, normalization, terminology mapping, and derived health views. Read it
with `PRIVACY.md`, `DATA.md`, and `SOURCES.md` before changing durable health
data behavior.

## Core Policy

HealthView OS should be FHIR-inspired and US Core-aligned, but the local
database is not a raw FHIR store.

- Preserve original source artifacts exactly as received or entered.
- Normalize what HealthView OS understands into typed canonical records.
- Keep standards-specific import and export behavior in adapters.
- Keep every normalized and derived record traceable to evidence.
- Preserve source text, local codes, mapped standard codes, confidence, and
  mapping method.
- Prefer clear HealthView OS domain tables over generic catch-all records.
- Do not force uncertain or conflicting data into misleading normalized facts.

## Standards Posture

FHIR is an interoperability boundary and design reference. HealthView OS should
use FHIR resource shapes, relationships, statuses, and terminology expectations
as guidance.

The practical US baseline is:

- FHIR R4 for near-term integration compatibility.
- Version-pinned US Core profiles for US clinical data expectations.
- USCDI as a reference for common patient data classes and elements.
- LOINC for labs, observations, and documents.
- RxNorm for medications.
- SNOMED CT for clinical concepts when available.
- ICD-10-CM for diagnosis classification when source systems provide it.
- CVX for immunizations.
- CPT and HCPCS for procedures, services, and billing where appropriate.
- UCUM for units.

Newer FHIR releases may inform design, but do not make HealthView OS depend on
a FHIR version that real-world integrations cannot commonly supply.

## Data Layers

HealthView OS data follows these layers:

```text
Original sources
-> Canonical HealthView OS records
-> Terminology mappings
-> Derived HealthView OS data
```

### Original Sources

Source artifacts include FHIR JSON, PDFs, images, CSVs, messages, portal
downloads, wearable exports, and manual-entry notes. They are evidence and must
not be treated as disposable cache.

### Canonical HealthView OS Records

Canonical records are typed local representations of facts such as people,
observations, health history, conditions, medications, allergies, encounters,
immunizations, documents, providers, coverage, claims, and bills.

These records should be optimized for local querying, forms, timelines,
summaries, visual health maps, and assistant grounding.

### Terminology Mappings

Terminology mappings connect original source text and codes to standard codes
and HealthView OS concepts. A mapping can be uncertain and should say so.

### Derived HealthView OS Data

Derived data includes timelines, summaries, trends, health views, warning
signs, scores, recommendations, and AI explanations. Derived data must remain
replaceable and traceable to the canonical records and source artifacts that
support it.

## Shared Primitives

Before expanding domain models, keep shared primitives consistent across
TypeScript schemas, SQLite tables, imports, and UI forms.

Recommended primitives:

- `Identifier`: system, value, assigner, period.
- `Coding`: system, code, display.
- `CodeableConcept`: text, codings, preferred coding, mapping confidence.
- `Quantity`: value, unit display, UCUM code, comparator.
- `Period`: start and end date or date-time.
- `ReferenceRange`: low, high, text, applies-to metadata.
- `HumanName`: text, family, given, prefix, suffix, use.
- `Address`: text plus structured address fields when known.
- `ContactPoint`: phone, email, URL, use, rank, period.
- `Annotation`: author, time, text.
- `EvidenceLink`: source artifact, provenance event, confidence, freshness,
  field path, and optional note.
- `ExternalResourceSnapshot`: preserved raw standard resource or import
  payload.
- `RecordLifecycleStatus`: active, inactive, resolved, superseded,
  entered_in_error, unknown.
- `VerificationStatus`: confirmed, unconfirmed, provisional, differential,
  refuted, entered_in_error, unknown.

## First Canonical Domains

Implement these domains before broad connector work.

### Person

FHIR reference: `Patient`.

Represents the person whose records are in the vault. Keep sex at birth, gender
identity, and administrative gender separate when introduced.

### Observation

FHIR reference: `Observation`.

Use for labs, vitals, wearable measurements, surveys, and simple clinical
facts. Do not use Observation for medications, allergies, conditions,
encounters, documents, or claims.

### Health History

HealthView OS's user-facing history model is personal-health oriented, not an
EHR problem list. Use `HealthHistoryItem` for medical, surgical/procedure,
family, social/lifestyle, reproductive, and other history entries the person
wants to track or remember.

### Condition

FHIR reference: `Condition`.

Use for imported or standards-aligned clinical conditions when a source system
provides them. Support uncertainty and contradiction.

### Allergy Or Intolerance

FHIR reference: `AllergyIntolerance`.

Use an explicit safety-focused model. Do not model allergies as generic
conditions or observations.

### Medication

FHIR references: `Medication`, `MedicationStatement`, `MedicationRequest`,
`MedicationDispense`.

Split medication data by meaning:

- `MedicationUse`: patient reports or evidence indicates use.
- `MedicationOrder`: prescription, order, or plan.
- `MedicationDispense`: pharmacy fill or supplied medication.

### Encounter And Appointment

FHIR references: `Encounter`, `Appointment`.

Use for visits, admissions, telehealth sessions, planned appointments, and other
care interactions.

### Immunization

FHIR reference: `Immunization`.

Include vaccine concept, CVX mapping when known, occurrence date, status, lot,
manufacturer, performer, site, route, dose, reactions, protocol metadata,
source text, and evidence.

### Document And Diagnostic Report

FHIR references: `DocumentReference`, `DiagnosticReport`.

Keep documents as source artifacts, but also create structured document/report
metadata. Diagnostic reports should group related observations, such as a lab
panel or imaging report.

### Provider, Organization, And Location

FHIR references: `Practitioner`, `PractitionerRole`, `Organization`,
`Location`.

Use these records for provenance, encounters, services, record requests, and
eventual care navigation.

### Coverage, Claim, And Billing

FHIR references: `Coverage`, `Claim`, `ExplanationOfBenefit`.

Model coverage, claims, authorizations, bills, payments, and explanations of
benefits explicitly.

## SQLite Shape

Use a shared record registry plus domain-specific tables. The registry gives
common lifecycle, subject, date, evidence, and provenance behavior without
reducing every record to an untyped blob.

Recommended high-level shape:

```text
sources
source_artifacts
provenance_events

health_records
record_evidence
external_resource_snapshots
terminology_mappings

people
observations
observation_components
observation_reference_ranges
conditions
allergy_intolerances
allergy_reactions
medication_uses
medication_orders
medication_dispenses
encounters
immunizations
diagnostic_reports
providers
organizations
locations
coverages
claims
bills
derived_insights
```

Use foreign keys, migrations, indexes for timelines and search, and validation
at both the TypeScript schema and SQLite boundaries.

## Form And Import Rules

Forms are a first-class source acquisition method. A saved form should create:

- A typed canonical record.
- A source origin for manual entry or the selected source.
- An acquisition event.
- A readable source artifact when practical, such as a manual-entry note.
- A provenance event.
- Evidence links from the canonical record to the source artifact and
  provenance.

Imports should create the same chain, with raw imported artifacts or external
resource snapshots preserved before normalization.

## Implementation Sequence

Recommended next milestones:

1. Add shared primitives and a record registry.
2. Add `Source`, `SourceArtifact`, `EvidenceLink`, `ProvenanceEvent`, and
   `DerivedInsight` TypeScript contracts.
3. Expand `Person` and `Observation` to support real demographics, labs, and
   vitals.
4. Add `Condition`, `AllergyIntolerance`, `MedicationUse`, `Encounter`, and
   `Immunization`.
5. Update Records forms to write typed canonical records.
6. Add document and diagnostic report grouping.
7. Add provider, organization, and location records.
8. Add coverage, claim, authorization, bill, and payment records.
9. Add FHIR R4/US Core import and export adapters after the canonical model is
   stable enough to map predictably.

## Review Checklist

Before merging health model changes, check:

- Does the change preserve original source artifacts?
- Is the canonical record typed rather than forced into a generic model?
- Does every normalized record have evidence and provenance?
- Are source text and source codes preserved after terminology mapping?
- Is uncertainty represented explicitly?
- Can the data be exported or mapped to relevant FHIR R4/US Core concepts later?
- Are durable records persisted in the local vault rather than client state?
- Are schema, migration, and UI form behavior updated together?
- Are privacy, logging, and remote-processing constraints still satisfied?
