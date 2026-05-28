// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      "react/jsx-sort-props": [
        "error",
        {
          callbacksLast: true,
          shorthandFirst: true,
          noSortAlphabetically: false, // 알파벳순 정렬
          reservedFirst: true,
        },
      ],
      // Import order 규칙
      "import/order": [
        "error",
        {
          groups: [
            "builtin", // Node.js 내장 모듈 (fs, path 등)
            "external", // npm 패키지 (react, expo 등)
            "internal", // 프로젝트 내부 모듈 (@/components 등)
            "parent", // 상위 디렉토리 모듈 (../components)
            "sibling", // 같은 디렉토리 모듈 (./Button)
            "index", // index 파일
          ],
          "newlines-between": "always", // 그룹 간 빈 줄 추가
          alphabetize: {
            order: "asc", // 알파벳순 정렬
            caseInsensitive: true, // 대소문자 구분 안함
          },
        },
      ],
    },
  },
]);
