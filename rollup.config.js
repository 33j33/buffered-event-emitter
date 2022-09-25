import { terser } from "rollup-plugin-terser";

export default {
    input: 'lib/esm/index.js',
    output: [
        {
            file: 'lib/bundle.esm.mjs',
            format: 'esm',
            exports: "named"
        },
        {
            file: 'lib/bundle.esm.min.mjs',
            format: 'esm',
            sourcemap: true,
            exports: "named",
            plugins: [terser()],
        },
        {
            file: 'lib/bundle.umd.js',
            format: 'umd',
            name: 'BufferedEventEmitter',
            exports: "named",
        },
        {
            file: 'lib/bundle.umd.min.js',
            format: 'umd',
            name: 'BufferedEventEmitter',
            sourcemap: true,
            exports: "named",
            plugins: [terser()],
        }
    ],
}