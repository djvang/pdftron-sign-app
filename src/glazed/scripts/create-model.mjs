import { writeFile } from 'node:fs/promises'
import { CeramicClient } from '@ceramicnetwork/http-client'
import { ModelManager } from '@glazed/devtools'
import { DID } from 'dids'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import { getResolver } from 'key-did-resolver'
import { fromString } from 'uint8arrays'

const SEED_DELEGATE = 'f6a860f31f6f5e221884da0ac43443d3f20ee6f4aa8f62f5cd78fc923d5ed12c';

console.log({ SEED_DELEGATE })

if (!SEED_DELEGATE) {
  throw new Error('Missing SEED environment variable')
}

// The seed must be provided as an environment variable
const seed = fromString(SEED_DELEGATE, 'base16')
// Create and authenticate the DID
const did = new DID({
  provider: new Ed25519Provider(seed),
  resolver: getResolver(),
})
await did.authenticate()

// Connect to the local Ceramic node
const ceramic = new CeramicClient('http://localhost:7007')
ceramic.did = did

// Create a manager for the model
const manager = new ModelManager({ ceramic })


// Create the schemas

const contractSchemaID = await manager.createSchema('Contract', {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Contract',
  type: 'object',
  properties: {
    "name": {
      "type": "string"
    },
    "initiator": {
      "type": "string"
    },
    "signers": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "steps": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "contractHash": {
      "type": "string"
    },
    "expiry": {
      "type": "string",
      format: 'date-time',
      title: 'date',
      maxLength: 30,
    }
  },
})

const contractsSchemaID = await manager.createSchema('Contracts', {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Contracts',
  type: 'object',
  properties: {
    notes: {
      type: 'array',
      title: 'contracts',
      items: {
        type: 'object',
        title: 'Contract',
        properties: {
          id: {
            $comment: `cip88:ref:${manager.getSchemaURL(contractSchemaID)}`,
            type: 'string',
            pattern: '^ceramic://.+(\\?version=.+)?',
            maxLength: 150,
          },
          name: {
            type: 'string',
            title: 'name',
            maxLength: 100,
          },
        },
      },
    },
  },
})

// Create the definition using the created schema ID
await manager.createDefinition('contracts', {
  name: 'contracts',
  description: 'Simple contracts',
  schema: manager.getSchemaURL(contractsSchemaID),
})

// Create a Contract with text that will be used as placeholder
await manager.createTile(
  'placeholderContract',
  { name: 'This is a placeholder contract' },
  { schema: manager.getSchemaURL(contractSchemaID) }
)

console.log({
  contractsSchemaID,
  contractSchemaID
})

// Write model to JSON file
await writeFile(new URL('model.json', import.meta.url), JSON.stringify(manager.toJSON()))
console.log('Encoded model written to scripts/model.json file')
