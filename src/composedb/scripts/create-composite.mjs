import { CeramicClient } from '@ceramicnetwork/http-client'
import {
  createComposite,
  writeEncodedComposite,
  writeEncodedCompositeRuntime,
} from '@composedb/devtools-node'
import { DID } from 'dids'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import { getResolver } from 'key-did-resolver'
import { fromString } from 'uint8arrays'

if (!process.env.DID_PRIVATE_KEY) {
  throw new Error('Missing DID_PRIVATE_KEY environment variable')
}

// The seed must be provided as an environment variable
const seed = fromString(process.env.DID_PRIVATE_KEY, 'base16')
// Create and authenticate the DID
const did = new DID({
  provider: new Ed25519Provider(seed),
  resolver: getResolver(),
})
await did.authenticate()

// Connect to the local Ceramic node
const ceramic = new CeramicClient('http://localhost:7007')
ceramic.did = did

// Create composite from schema
const composite = await createComposite(
  ceramic,
  new URL('../schema.graphql', import.meta.url)
)

// Display models for Ceramic node config
console.log(`Composite models: ${JSON.stringify(composite.modelIDs)}`)

// Write encoded definition
const compositePath = new URL('../data/composite.json', import.meta.url)
await writeEncodedComposite(composite, compositePath)
console.log('Encoded model written to composite.json file')

// Write runtime file and schema
await writeEncodedCompositeRuntime(
  ceramic,
  compositePath,
  new URL('../__generated__/definition.ts', import.meta.url),
  new URL('../data/schema.graphql', import.meta.url)
)
console.log('Runtime files successfully written')