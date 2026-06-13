import assert from "node:assert/strict"

import { HealthViewWorkspaceSchema, type HealthViewWorkspace } from "@healthviewos/schema"
import "fake-indexeddb/auto"

const vault = await import("./index")

async function runTest(name: string, test: () => Promise<void>) {
  await vault.clearBrowserVault()
  await test()
  console.log(`ok - ${name}`)
}

await runTest("seeds workspace when empty", async () => {
  const workspace = await vault.loadWorkspace()

  assert.equal(workspace.schemaVersion, 1)
  assert.equal(workspace.vault.id, "vault_default")
  assert.equal(workspace.recordSet.people.length, 1)
})

await runTest("loads persisted workspace after save", async () => {
  const workspace = await vault.loadWorkspace()
  const changedWorkspace = {
    ...workspace,
    vault: {
      ...workspace.vault,
      label: "Persisted Browser Vault",
    },
  } satisfies HealthViewWorkspace

  await vault.saveWorkspace(changedWorkspace)

  const loadedWorkspace = await vault.loadWorkspace({ seedIfMissing: false })

  assert.equal(loadedWorkspace.vault.label, "Persisted Browser Vault")
})

await runTest("rejects invalid workspace writes", async () => {
  const workspace = await vault.loadWorkspace()
  const invalidWorkspace = {
    ...workspace,
    recordSet: {
      ...workspace.recordSet,
      visualVitals: [
        {
          ...workspace.recordSet.visualVitals[0],
          evidence: [],
        },
      ],
    },
  }

  assert.throws(() => HealthViewWorkspaceSchema.parse(invalidWorkspace))
  await assert.rejects(vault.saveWorkspace(invalidWorkspace as HealthViewWorkspace))
})

await runTest("exports and imports valid workspace JSON", async () => {
  const workspace = await vault.loadWorkspace()
  const importedWorkspace = {
    ...workspace,
    vault: {
      ...workspace.vault,
      label: "Imported Browser Vault",
    },
  } satisfies HealthViewWorkspace

  await vault.importWorkspaceJson(JSON.stringify(importedWorkspace))

  const exportedJson = await vault.exportWorkspaceJson()
  const exportedWorkspace = HealthViewWorkspaceSchema.parse(JSON.parse(exportedJson))

  assert.equal(exportedWorkspace.vault.label, "Imported Browser Vault")
})

await runTest("reset restores the seed workspace", async () => {
  const workspace = await vault.loadWorkspace()

  await vault.saveWorkspace({
    ...workspace,
    vault: {
      ...workspace.vault,
      label: "Changed Browser Vault",
    },
  })

  const resetWorkspace = await vault.resetWorkspaceToSeed()

  assert.equal(resetWorkspace.vault.label, "Example HealthView OS Vault")
})
