/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  globals: {
    "ts-jest": {
      isolatedModules: true, // fix to speed up tests
    },
  },
  moduleNameMapper: {
    "^@buffered-event-emitter$": "<rootDir>/src"
    // "^@buffered-event-emitter$": "<rootDir>/lib/bundle.esm.min.js"
  }
};
