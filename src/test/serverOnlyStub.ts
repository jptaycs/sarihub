// Vitest stand-in for Next's "server-only" marker. Under Next the real module
// throws if a server file is imported into a client bundle; under Vitest
// there is no client bundle, so services can be exercised directly against
// a local Postgres (see *.integration.test.ts).
export {};
