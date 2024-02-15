export default refs;
export type Options = {
    /**
     * Limit ref substitution by glob pattern to a subset of files
     */
    pattern?: string | string[];
};
/**
 * A metalsmith plugin to refer to other files and global metadata from a file's refs property
 *
 * @param {Options} options
 * @returns {import('metalsmith').Plugin}
 */
declare function refs(options: Options): import('metalsmith').Plugin;
