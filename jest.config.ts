import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "frontend/tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/frontend/$1",
  },
  rootDir: ".",
  testMatch: ["<rootDir>/frontend/**/*.test.{ts,tsx}"],
};

export default config;
