import { terser } from "rollup-plugin-terser";
import pkg from "./package.json";

const footer = () => {
    return new Promise((resolve) => {
        resolve(`(function () { if (typeof window !== "undefined") window.BufferedEventEmitter = window["${pkg.name}"].BufferedEventEmitter})()`)
    })
}

export default {
    input: 'lib/esm/index.js',
    output: [
        {
            file: 'lib/bundle.esm.mjs',
            format: 'esm',
        },
        {
            file: 'lib/bundle.esm.min.mjs',
            format: 'esm',
            sourcemap: true,
            plugins: [terser()]
        },
        {
            file: 'lib/bundle.umd.js',
            format: 'umd',
            name: pkg.name,
            footer
        },
        {
            file: 'lib/bundle.umd.min.js',
            format: 'umd',
            name: pkg.name,
            sourcemap: true,
            footer,
            plugins: [terser()]
        }
    ],
}