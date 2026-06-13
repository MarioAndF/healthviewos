const globalWithProcess = globalThis as unknown as {
  process?: {
    env?: Record<string, string | undefined>
    versions?: Record<string, string | undefined>
  }
}

globalWithProcess.process ??= {
  env: {},
  versions: {},
}
globalWithProcess.process.env ??= {}
globalWithProcess.process.versions ??= {}
