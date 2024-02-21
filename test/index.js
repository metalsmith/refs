/* eslint-env node,mocha */
import assert from 'node:assert'
import { resolve, dirname } from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import equals from 'assert-dir-equal'
import Metalsmith from 'metalsmith'
import plugin from '../src/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { name } = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))

function fixture(dir) {
  dir = resolve(__dirname, 'fixtures', dir)
  return {
    dir,
    expected: resolve(dir, 'expected'),
    actual: resolve(dir, 'build')
  }
}

function toJSON(files) {
  for (const file of Object.values(files)) {
    delete file.stats
    delete file.contents
    delete file.mode
  }

  for (const [path, file] of Object.entries(files)) {
    // eslint-disable-next-line
    const { stats, contents, ...others } = file
    const jsonPath = path.replace(/\..*?$/, '.json')
    files[jsonPath] = {
      ...others,
      contents: JSON.stringify(others, null, 2)
    }
    delete files[path]
  }
}

describe('@metalsmith/refs', function () {
  it('should export a named plugin function matching package.json name', function () {
    const namechars = name.split('/')[1]
    const camelCased = namechars.split('').reduce((str, char, i) => {
      str += namechars[i - 1] === '-' ? char.toUpperCase() : char === '-' ? '' : char
      return str
    }, '')
    assert.strictEqual(plugin().name, camelCased)
  })

  it('should not crash the metalsmith build when using default options', async function () {
    let { actual, expected, dir } = fixture('default')
    await Metalsmith(dir).env('DEBUG', process.env.DEBUG).use(plugin()).use(toJSON).build()
    equals(actual, expected)
    await Metalsmith(dir).env('DEBUG', process.env.DEBUG).use(plugin(true)).use(toJSON).build()
    equals(actual, expected)
  })

  it('should provide reliable refs through a Proxy object', async function () {
    const { actual, expected, dir } = fixture('ref-proxy')
    const files = await Metalsmith(dir).env('DEBUG', process.env.DEBUG).use(plugin()).use(toJSON).build()
    const ref = files['index.json'].refs.about
    ref.temp = 'dynamic'
    Object.defineProperty(ref, 'added', { value: 'test' })
    delete ref.temp
    assert.strictEqual('refs' in ref, false)
    assert.strictEqual('about_title' in ref, true)
    assert.strictEqual(ref.refs, undefined)
    assert.strictEqual(ref.about_title, 'About')
    assert.deepStrictEqual(Object.keys(ref), ['about_title', 'id', 'added'])
    assert.throws(() => {
      Object.defineProperty(ref, 'refs', { value: {} })
    })
    equals(actual, expected)
  })

  it('should resolve absolute refs to metalsmith.source()', async function () {
    const { actual, expected, dir } = fixture('absolute-refs')
    await Metalsmith(dir).env('DEBUG', process.env.DEBUG).use(plugin()).use(toJSON).build()
    equals(actual, expected)
  })

  it('should resolve relative and circular refs', async function () {
    const { actual, expected, dir } = fixture('relative-refs')
    await Metalsmith(dir).env('DEBUG', process.env.DEBUG).use(plugin()).use(toJSON).build()
    equals(actual, expected)
  })

  it('should resolve refs as "file:" when no protocol is given', async function () {
    const { actual, expected, dir } = fixture('protocol-file-shortcut')
    await Metalsmith(dir).env('DEBUG', process.env.DEBUG).use(plugin()).use(toJSON).build()
    equals(actual, expected)
  })

  it('should resolve refs with the "id:" protocol', async function () {
    const { actual, expected, dir } = fixture('fixed-ref')
    await Metalsmith(dir).env('DEBUG', process.env.DEBUG).use(plugin()).use(toJSON).build()
    equals(actual, expected)
  })

  it('should resolve refs with the "metadata:" protocol', async function () {
    const { actual, expected, dir } = fixture('metadata-ref')
    await Metalsmith(dir)
      .metadata({
        build: {
          date: new Date('2024-01-01'),
          version: 'v1.0.0'
        }
      })
      .env('DEBUG', process.env.DEBUG)
      .use(plugin())
      .use(toJSON)
      .build()
    equals(actual, expected)
  })

  it('should throw an error on invalid protocols', async function () {
    try {
      const { dir } = fixture('invalid-protocol')
      await Metalsmith(dir).env('DEBUG', process.env.DEBUG).use(plugin()).use(toJSON).build()
    } catch (err) {
      const expected = '@metalsmith/refs - Unknown protocol "invalid-protocol" for file'
      assert.strictEqual(err.message.slice(0, expected.length), expected)
    }
  })
})
