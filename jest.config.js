module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testMatch: [
    "<rootDir>/__tests__/**/*.(ts|tsx|js)",
    "<rootDir>/app/**/*.(test|spec).(ts|tsx|js)",
  ],
  collectCoverageFrom: ["app/**/*.(ts|tsx)", "!app/**/*.d.ts"],
  moduleDirectories: ["node_modules", "<rootDir>/"],
};
