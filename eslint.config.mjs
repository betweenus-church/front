// ESLint 설정 (Next.js 16 공식 flat config + Prettier와 충돌하는 규칙 끄기)
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        // 모노레포: Next.js 앱이 client/, admin/ 두 곳에 있다.
        settings: {
            next: { rootDir: ["client/", "admin/"] },
            react: { version: "19.2" },
        },
    },
    prettier,
    globalIgnores([
        "**/node_modules/**",
        "**/.next/**",
        "**/.next-dev/**",
        "**/.next-qa/**",
        "**/.next-production/**",
        ".server/**",
        "**/next-env.d.ts",
    ]),
]);
