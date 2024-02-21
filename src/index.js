import { relative, dirname, isAbsolute, normalize } from 'path'
import get from 'dlv'

/**
 * @typedef Options
 * @property {String|String[]} [pattern='**'] Limit ref substitution by glob pattern to a subset of files
 */

/** @type {Options} */
const defaults = {
  pattern: '**'
}

/**
 * Normalize plugin options
 * @param {Options} [options]
 * @returns {Object}
 */
function normalizeOptions(options = {}) {
  if (options === true || typeof options === 'undefined') return { ...defaults }
  return Object.assign({}, defaults, options || {})
}

/** @type {ProxyHandler} */
const refProxyHandler = {
  get(target, key) {
    if (key === 'refs') return undefined
    return target[key]
  },
  has(target, key) {
    if (key === 'refs') return false
    return Reflect.has(target, key)
  },
  set(target, key, value) {
    if (key !== 'refs') target[key] = value
    return true
  },
  deleteProperty(target, key) {
    if (key === 'refs' || !(key in target)) return false
    return delete target[key]
  },
  ownKeys(target) {
    return Object.keys(target).filter((k) => k !== 'refs')
  },
  defineProperty(target, key, descriptor) {
    if (key === 'refs') return false
    if (descriptor && 'value' in descriptor) {
      target[key] = descriptor.value
    }
    return target
  },
  getOwnPropertyDescriptor(target, key) {
    const value = target[key]
    return value
      ? {
          value,
          writable: true,
          enumerable: true,
          configurable: true
        }
      : undefined
  }
}

/**
 * A metalsmith plugin to refer to other files and global metadata from a file's refs property
 *
 * @param {Options} options
 * @returns {import('metalsmith').Plugin}
 */
function refs(options) {
  options = normalizeOptions(options)

  return function refs(files, metalsmith, done) {
    function srcRelPath(subdir, path) {
      if (isAbsolute(path)) path = path.slice(1)
      const referringPath = metalsmith.path(metalsmith.source(), subdir)
      return relative(metalsmith.source(), metalsmith.path(referringPath, normalize(path)))
    }

    const meta = metalsmith.metadata()
    const debug = metalsmith.debug('@metalsmith/refs')
    debug('Running with options: %O', options)

    const withRefs = []
    const fileList = metalsmith
      .match(options.pattern, Object.keys(files))
      .map((filePath) => [filePath, files[filePath]])

    fileList.forEach((entry) => {
      const [path, file] = entry
      if (!file.id) file.id = path.replace(/\\/g, '/')
      if (file.refs) withRefs.push(entry)
    })

    if (withRefs.length) debug('Processing refs for %s file(s)', withRefs.length)
    else debug.warn('No files with "refs" defined.')

    while (withRefs.length) {
      const [path, file] = withRefs.shift()

      Object.entries(file.refs).forEach(([name, ref]) => {
        let delimPos = ref.indexOf(':')
        // omitting the protocol is a shortcut for 'file:'
        if (delimPos === -1) {
          ref = `file:${ref}`
          delimPos = 4
        }

        const protocol = ref.slice(0, delimPos)
        const lookup = ref.slice(delimPos + 1)
        let resolved

        switch (protocol) {
          case 'metadata':
            resolved = get(meta, lookup)
            file.refs[name] = resolved
            break
          case 'file':
            resolved = files[srcRelPath(dirname(path), lookup)]
            if (resolved) {
              file.refs[name] = new Proxy(resolved, refProxyHandler)
            }
            break
          case 'id':
            resolved = fileList.find((f) => f[1].id === lookup)
            if (resolved) {
              resolved = resolved[1]
              file.refs[name] = new Proxy(resolved, refProxyHandler)
            }
            break
          default:
            done(
              new Error(
                '@metalsmith/refs - Unknown protocol "' +
                  protocol +
                  '" for file "' +
                  metalsmith.path(metalsmith.source(), file.id) +
                  '".'
              )
            )
            return
        }

        if (!resolved) {
          debug.warn('Unable to resolve ref "%s" in file "%s"', `${protocol}:${lookup}`, path)
        }
      })
    }

    done()
  }
}

export default refs
