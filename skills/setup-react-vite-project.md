# Skill: Setup React + Vite + TypeScript Project

## When to Use

User asks to scaffold a new React + Vite + TypeScript project with full tooling (lint, format, pre-commit hooks, conventional commits, VS Code workspace settings, optional Tailwind / React Compiler / Vitest).

Triggers:

- "set up new React project"
- "scaffold Vite React with tooling"
- "bootstrap a new frontend"
- "init React project with husky + lint + prettier"

## Input Needed

Ask the user upfront (one batch):

1. **Project name** (folder name, npm package name)
2. **Existing folder?** Empty / Has files (e.g., README from `git clone`)
3. **Optional features**: Tailwind? React Compiler? Vitest baseline?
4. **Anticipated runtime stack** (informational — affects VS Code extensions, comments in README). E.g., "antd + Redux + TanStack Query", "shadcn + Zustand", "minimal".

Defaults if user doesn't specify:

- Empty folder.
- Vitest baseline: yes (config-only, no tests).
- Tailwind: no (project-specific).
- React Compiler: no (requires React 19.0+; opt-in).

## Pre-flight check

```bash
node --version       # Want 22 LTS or 24 LTS
pnpm --version       # Want 10+
```

If `pnpm` missing: `npm install -g pnpm` or use corepack.

## Steps

### Step 1: Initialize Vite project

**If folder is empty or does not exist**:

```bash
pnpm create vite <project-name> --template react-ts
cd <project-name>
pnpm install
```

**If folder has existing files** (e.g., README from cloned repo):

```bash
cd <project-name>
pnpm create vite tmp --template react-ts
mv tmp/* tmp/.[!.]* . 2>/dev/null
rmdir tmp
pnpm install
```

### Step 2: Install dev tooling

```bash
pnpm add -D \
  prettier \
  eslint-config-prettier \
  husky \
  lint-staged \
  @commitlint/cli \
  @commitlint/config-conventional \
  @types/node \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  jsdom
```

If user opted in for **Tailwind v4**:

```bash
pnpm add -D tailwindcss @tailwindcss/vite
```

If user opted in for **React Compiler** (React 19.0+):

```bash
pnpm add -D @babel/core @rolldown/plugin-babel babel-plugin-react-compiler @types/babel__core
```

### Step 3: Create `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

### Step 4: Create `.prettierrc`

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### Step 5: Create `.prettierignore`

```
dist
node_modules
pnpm-lock.yaml
*.min.js
public
coverage
```

### Step 6: Replace `eslint.config.js`

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig(
  globalIgnores(['dist', 'node_modules', 'coverage']),
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  prettierConfig,
)
```

### Step 7: Update `tsconfig.app.json`

Replace `compilerOptions` block:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,

    "ignoreDeprecations": "6.0",

    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### Step 8: Update root `tsconfig.json`

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Step 9: Update `vite.config.ts`

Base:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**If Tailwind opted in**, add to plugins:

```ts
import tailwindcss from '@tailwindcss/vite'
// plugins: [react(), tailwindcss()]
```

**If React Compiler opted in**, add:

```ts
import react, { reactCompilerPreset } from '@vitejs/plugin-react' // import preset
import babel from '@rolldown/plugin-babel'
// plugins: [react(), tailwindcss(), babel({ presets: [reactCompilerPreset()] })]
```

### Step 10: Create `.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "js/ts.tsdk.path": "node_modules/typescript/lib",
  "js/ts.tsdk.promptToUseWorkspaceVersion": true,
  "files.eol": "\n",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true,
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  "explorer.fileNesting.enabled": true,
  "explorer.fileNesting.expand": false,
  "explorer.fileNesting.patterns": {
    "*.ts": "$(capture).test.ts, $(capture).test.tsx",
    "*.tsx": "$(capture).test.ts, $(capture).test.tsx",
    "*.env": "$(capture).env.*",
    "package.json": "pnpm-lock.yaml,yarn.lock,LICENSE,README*,CHANGELOG*,CNAME,.gitattributes,.gitignore,.editorconfig,.prettierrc,.prettierignore,commitlint.config.js,eslint.config.js"
  }
}
```

### Step 11: Create `.vscode/extensions.json`

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "editorconfig.editorconfig"
  ]
}
```

Add `bradlc.vscode-tailwindcss` if Tailwind opted in.

### Step 12: Husky + lint-staged

```bash
pnpm exec husky init
```

Replace `.husky/pre-commit`:

```sh
pnpm exec lint-staged
```

Create `.husky/commit-msg`:

```sh
pnpm exec commitlint --edit "$1"
```

Both files must be executable. Husky init handles this; verify with `ls -la .husky/`.

### Step 13: Update `package.json` — add `lint-staged` block

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

### Step 14: Create `commitlint.config.js`

```js
export default {
  extends: ['@commitlint/config-conventional'],
}
```

### Step 15: Create env files

```bash
touch .env .env.development .env.production .env.example
```

`.env.example`:

```
# Public env vars (prefix VITE_ to expose to client)
VITE_API_BASE_URL=
```

`.env.development` and `.env.production`: mirror example, leave values blank.

### Step 16: Update `package.json` scripts

Replace `scripts` block:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "type-check": "tsc -b --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,json,md}\"",
    "test": "vitest",
    "test:run": "vitest run",
    "prepare": "husky"
  }
}
```

### Step 17: Vitest baseline

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
```

```bash
mkdir -p src/test
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

### Step 18: If Tailwind opted in — update `src/index.css`

Replace contents:

```css
@import 'tailwindcss';

html,
body,
#root {
  height: 100%;
  margin: 0;
}
```

### Step 19: Replace `README.md`

```markdown
# <project-name>

<one-line description>

## Stack

- React 19.2 + TypeScript
- Vite 8
- (runtime stack TBD)

## Quick start

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## Scripts

| Script            | Purpose                  |
| ----------------- | ------------------------ |
| `pnpm dev`        | Dev server with HMR      |
| `pnpm build`      | Production build         |
| `pnpm preview`    | Preview production build |
| `pnpm type-check` | TypeScript check         |
| `pnpm lint`       | ESLint                   |
| `pnpm lint:fix`   | ESLint auto-fix          |
| `pnpm format`     | Prettier write           |
| `pnpm test`       | Vitest watch             |

## Commits

Conventional Commits enforced via commitlint.
```

### Step 20: Verify

Run each command and confirm success:

```bash
pnpm type-check    # passes
pnpm lint          # passes (zero errors)
pnpm format:check  # passes
pnpm build         # succeeds
pnpm test:run      # exits clean, "No test files found"
pnpm dev           # boots http://localhost:5173
```

### Step 21: Commit history

Make granular commits:

```bash
git add .editorconfig && git commit -m "chore: add editorconfig"
git add .prettierrc .prettierignore && git commit -m "chore: add prettier config"
git add eslint.config.js && git commit -m "chore: tighten eslint config"
git add tsconfig*.json && git commit -m "chore: strict tsconfig with path alias"
git add vite.config.ts && git commit -m "chore: vite config + path alias"
git add .vscode/ && git commit -m "chore: vscode workspace settings"
git add .husky/ package.json && git commit -m "chore: husky + lint-staged hooks"
git add commitlint.config.js && git commit -m "chore: add commitlint"
git add .env* && git commit -m "chore: env file convention"
git add vitest.config.ts src/test/ && git commit -m "chore: vitest baseline"
git add package.json && git commit -m "chore: standardize scripts"
git add README.md && git commit -m "docs: update README"
```

## Verification Checklist

- [ ] All 6 verify commands in Step 20 pass.
- [ ] `git commit -m "bad"` is rejected by commitlint.
- [ ] `git commit -m "feat: ok"` succeeds.
- [ ] Pre-commit hook runs Prettier + ESLint on staged files.
- [ ] VS Code formats on save and shows ESLint diagnostics.
- [ ] Path alias `import App from '@/App'` resolves in both Vite and TS.
- [ ] If Tailwind opted in: `<div className="flex items-center p-4">` renders correctly in dev.
- [ ] If React Compiler opted in: build succeeds with babel preset attached (no errors).

## Common Pitfalls

1. **`.husky/pre-commit` from `husky init`** has default `npm test` line — replace with `pnpm exec lint-staged`.
2. **Path alias in two places**: both `vite.config.ts` (for runtime) and `tsconfig.app.json` (for IDE). Both required.
3. **ESLint config order**: `prettierConfig` LAST in the export, otherwise rule conflicts resurface.
4. **VS Code TypeScript SDK key**: use `js/ts.tsdk.path` (new) not `typescript.tsdk` (deprecated warning).
5. **Husky hooks not executable on Windows**: `chmod +x .husky/*` may be needed in WSL or after git clone.
6. **`pnpm exec husky init` doesn't overwrite existing `.husky/`**. If re-running setup, delete `.husky/` first.
7. **`erasableSyntaxOnly: true`** rejects TS enums and namespaces. Use `as const` objects instead.

## Output file structure

```
my-app/
├── .editorconfig
├── .env
├── .env.development
├── .env.production
├── .env.example
├── .gitignore
├── .husky/
│   ├── pre-commit
│   └── commit-msg
├── .prettierignore
├── .prettierrc
├── .vscode/
│   ├── settings.json
│   └── extensions.json
├── README.md
├── commitlint.config.js
├── eslint.config.js
├── index.html
├── package.json
├── pnpm-lock.yaml
├── public/
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── main.tsx
│   ├── assets/
│   └── test/
│       └── setup.ts
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

## Reference

Full guide with reasoning, alternatives, and decision tree: `React_Vite_Project_Setup_Guide.md` (companion document).
