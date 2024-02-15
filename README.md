# @metalsmith/refs

A metalsmith plugin to easily refer to other files and global metadata from `file.refs`

[![metalsmith: core plugin][metalsmith-badge]][metalsmith-url]
[![npm: version][npm-badge]][npm-url]
[![ci: build][ci-badge]][ci-url]
[![code coverage][codecov-badge]][codecov-url]
[![license: LGPL][license-badge]][license-url]

## Features

- Gives your files a default, but customizable _identity_ matching its relative file path
- Substitutes a file's `refs` keypaths with their target file- or metadata values
- Allows tracing a file's manipulations via its `id` property
- Batch assign references with [@metalsmith/default-values](https://github.com/metalsmith/default-values)

## Installation

NPM:

```
npm install @metalsmith/refs
```

Yarn:

```
yarn add @metalsmith/refs
```

## Usage

Pass `@metalsmith/refs` to `metalsmith.use` :

```js
import refs from '@metalsmith/refs'
import layouts from '@metalsmith/layouts'

metalsmith.use(refs()) // defaults
metalsmith.use(
  refs({
    // explicit defaults
    pattern: '**'
  })
)
```

Now you can, say, reference child documentation pages in the index `src/docs/index.html`:

```yaml
---
id: docs_index
refs:
  # relative refs will be resolved vs the current file
  getting_started: file:./getting-started/index.html
  # absolute refs will be resolved vs metalsmith.source()
  usage_guide: file:/docs/usage-guide/index.html
---
```

Refs are defined in a `protocol:path` format. As a shortcut, not specifying the `protocol:` part will default to `file:`.

When @metalsmith/refs runs, it will substitute the refs with the actual files:

```js
{
  'docs/index.html': {
    id: 'docs_index',
    refs: {
      getting_started: {
        id: 'docs/getting-started/index.html',
        contents: Buffer.from('...'),
        stats: {...}
      },
      usage_guide: {
        id: 'docs/usage-guide/index.html',
        contents: Buffer.from('...'),
        stats: {...}
      }
    }
  }
}
```

The file references are _shallowly cloned_ from the targets they refer to _at the moment they are accessed_, i.e. they will be in sync when other plugins alter them later. To avoid circular references, you cannot access `file.refs.otherFile.refs`.

As the example above shows, @metalsmith/refs will also add an `id` property to each processed file, unless you define an [explicit id](#custom-ids). By default the `id` is the file's path relative to metalsmith.source(), and with backslashes converted to forward slashes for cross-platform compatibility.

### Plugin order

It is advised to use this plugin at the start of your build chain. Why? If you used plugins like [@metalsmith/permalinks](https://github.com/metalsmith/permalinks) that change the file's path before this plugin, the `id` property will not match the source path of the file.

Using @metalsmith/refs at the start of your plugin chain gives you an easy way to _trace_ file transforms by other plugins.

### Custom ids

You can define an id property before @metalsmith/refs runs, and it will not be overwritten. In the example above, the getting-started and usage-guide pages could refer to the index with the `id:` protocol:

```yaml
---
refs:
  docs_home: id:docs_index
---
```

This is useful if you wish to decouple a file's identity from its path on disk and to avoid having to commit a lot of small changes when/if you plan to reorganize source files.

### Reference global metadata

Metalsmith.metadata() keys can be referenced with the `metadata:` protocol, e.g.:

`docs/index.html`

```yaml
---
refs:
  navigation: metadata:navigation
  articles: metadata:collections.articles
---
```

As the example demonstrates `dot.delimited.keypaths` are also supported.

Referencing the entire `metalsmith.metadata()` object is not possible. Plugins like [@metalsmith/in-place](https://github.com/metalsmith/in-place) or [@metalsmith/layouts](https://github.com/metalsmith/layouts) already allow access to the global metadata in their render contexts.

### Batch references by filepath

Use [@metalsmith/default-values](https://github.com/metalsmith/default-values) before @metalsmith/refs to automatically assign refs by glob patterns:

```js
metalsmith
  .use(
    defaultValues([
      {
        pattern: 'docs/*/*.html',
        defaults: {
          refs: {
            docs_index: 'file:./docs/index.html',
            globalLinks: metalsmith.metadata().globalLinks
          }
        }
      }
    ])
  )
  .use(refs())
```

### Debug

To enable debug logs, set the `DEBUG` environment variable to `@metalsmith/refs*`:

```js
metalsmith.env('DEBUG', '@metalsmith/refs*')
```

Alternatively you can set `DEBUG` to `@metalsmith/*` to debug all Metalsmith core plugins.

### CLI usage

To use this plugin with the Metalsmith CLI, add `@metalsmith/refs` to the `plugins` key in your `metalsmith.json` file:

```json
{
  "plugins": [
    {
      "@metalsmith/refs": {}
    }
  ]
}
```

## License

[LGPL-3.0](LICENSE)

[npm-badge]: https://img.shields.io/npm/v/@metalsmith/refs.svg
[npm-url]: https://www.npmjs.com/package/@metalsmith/refs
[ci-badge]: https://github.com/metalsmith/refs/actions/workflows/test.yml/badge.svg
[ci-url]: https://github.com/metalsmith/refs/actions/workflows/test.yml
[metalsmith-badge]: https://img.shields.io/badge/metalsmith-core_plugin-green.svg?longCache=true
[metalsmith-url]: https://metalsmith.io
[codecov-badge]: https://img.shields.io/coveralls/github/metalsmith/refs
[codecov-url]: https://coveralls.io/github/metalsmith/refs
[license-badge]: https://img.shields.io/github/license/metalsmith/refs
[license-url]: LICENSE
