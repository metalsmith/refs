import { Plugin } from 'metalsmith';

export default refs;
export type Options = {
    key: string;
};
/**
 * A Metalsmith plugin to serve as a boilerplate for other core plugins
 */
declare function refs(options: Options): Plugin;
