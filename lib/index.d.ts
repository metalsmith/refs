import { Plugin } from 'metalsmith';

export default corePlugin;
export type Options = {
    key: string;
};
/**
 * A Metalsmith plugin to serve as a boilerplate for other core plugins
 */
declare function corePlugin(options: Options): Plugin;
