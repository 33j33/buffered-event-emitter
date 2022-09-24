export default {
    input: 'lib/esm/index.js',
    output: [
        {
            file: 'lib/bundles/bundle.esm.mjs',
            format: 'esm',
            sourcemap: true
        },
        {
            file: 'lib/bundles/bundle.umd.js',
            format: 'umd',
            name: 'BufferedEventEmitter',
            sourcemap: true
        },
    ],
}