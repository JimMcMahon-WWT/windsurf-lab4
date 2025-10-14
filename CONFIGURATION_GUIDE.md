# Configuration Files Guide

## Overview

This guide explains all the configuration files in the monorepo root and what they do.

---

## ✅ Configuration Files Checklist

Here are all the configuration files you should have in your project root:

```
ecommerce-monorepo/
├── .editorconfig          ✅ Created - Editor consistency
├── .env.example           ✅ Created - Environment variables template
├── .eslintrc.js           ✅ Created - Linting rules
├── .gitignore             ✅ Created - Git ignore patterns
├── .prettierrc            ✅ Created - Code formatting rules
├── .prettierignore        ✅ Created - Prettier ignore patterns
├── package.json           ✅ Created - Root dependencies & scripts
├── tsconfig.json          ✅ Created - TypeScript configuration
└── turbo.json             ✅ Created - Turborepo configuration
```

---

## 📄 File-by-File Explanation

### 1. package.json

**Purpose:** Root package configuration with npm workspaces

**Key Sections:**

```json
{
  "name": "ecommerce-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",        // Frontend applications
    "services/*",    // Backend microservices
    "packages/*"     // Shared libraries
  ],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test"
  }
}
```

**What it does:**
- Defines workspace locations (apps, services, packages)
- Lists common scripts that run across all workspaces
- Manages root-level dependencies (turbo, prettier, eslint)

---

### 2. turbo.json

**Purpose:** Configures Turborepo for fast, cached builds

**Key Configuration:**

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],      // Build dependencies first
      "outputs": ["dist/**"]         // Cache these outputs
    },
    "dev": {
      "cache": false,                // Don't cache dev mode
      "persistent": true             // Keep running
    }
  }
}
```

**What it does:**
- Defines build pipeline and dependencies
- Configures caching for faster rebuilds
- Specifies which tasks can run in parallel

---

### 3. tsconfig.json

**Purpose:** Root TypeScript configuration that other configs extend

**Key Options:**

```json
{
  "compilerOptions": {
    "target": "ES2022",              // JavaScript version to compile to
    "module": "commonjs",            // Module system
    "strict": true,                  // Enable all strict type checks
    "declaration": true,             // Generate .d.ts files
    "composite": true,               // Enable project references
    "esModuleInterop": true,         // Better CommonJS interop
    "skipLibCheck": true             // Skip type checking of .d.ts files
  }
}
```

**What it does:**
- Sets strict TypeScript defaults
- Enables project references for monorepo
- Provides base config for all services/packages

---

### 4. .eslintrc.js

**Purpose:** Code linting rules to catch errors and enforce style

**Key Rules:**

```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'  // Must be last to override other formatting rules
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    'import/order': 'error'  // Enforce import ordering
  }
}
```

**What it does:**
- Catches common JavaScript/TypeScript errors
- Enforces consistent code style
- Auto-fixable with `npm run lint:fix`

---

### 5. .prettierrc

**Purpose:** Automatic code formatting

**Configuration:**

```json
{
  "semi": true,                // Semicolons at end of statements
  "singleQuote": true,         // Use single quotes
  "printWidth": 100,           // Max line length
  "tabWidth": 2,               // 2-space indentation
  "trailingComma": "es5"       // Trailing commas where valid in ES5
}
```

**What it does:**
- Automatically formats code on save (with editor plugin)
- Ensures consistent formatting across team
- Reduces formatting debates in code reviews

---

### 6. .gitignore

**Purpose:** Tells Git which files/folders to ignore

**Key Sections:**

```
node_modules/      # Dependencies (don't commit)
dist/              # Build outputs
.env               # Environment variables (secrets!)
*.log              # Log files
.turbo/            # Turbo cache
```

**What it does:**
- Prevents committing large node_modules folders
- Keeps secrets (.env files) out of version control
- Excludes build artifacts and cache

---

### 7. .env.example

**Purpose:** Template for environment variables

**Usage:**

```bash
# 1. Copy to .env
cp .env.example .env

# 2. Fill in actual values
# Edit .env with your database passwords, API keys, etc.

# 3. Never commit .env (it's in .gitignore)
```

**What it does:**
- Documents all required environment variables
- Provides safe defaults for development
- Shows which secrets need to be configured

---

### 8. .editorconfig

**Purpose:** Consistent editor settings across team

**Settings:**

```
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
```

**What it does:**
- Works with most editors (VS Code, IntelliJ, Vim)
- Ensures consistent indentation
- Prevents line ending issues (Windows vs Unix)

---

### 9. .prettierignore

**Purpose:** Files Prettier should not format

**Common Entries:**

```
node_modules
dist
build
*.min.js
package-lock.json
```

**What it does:**
- Excludes generated files
- Avoids formatting minified code
- Skips lock files

---

## 🚀 Step-by-Step Setup

### Step 1: Verify All Files Exist

```bash
# Check if all config files are present
ls -la | grep -E "\.(json|js|gitignore|prettierrc|editorconfig|env\.example)"
```

You should see:
```
✅ .editorconfig
✅ .env.example
✅ .eslintrc.js
✅ .gitignore
✅ .prettierrc
✅ .prettierignore
✅ package.json
✅ tsconfig.json
✅ turbo.json
```

### Step 2: Install Root Dependencies

```bash
# Install all dependencies from package.json
npm install
```

This installs:
- `turbo` - Build orchestration
- `prettier` - Code formatting
- `eslint` - Code linting
- `typescript` - Type checking
- Plus plugins and configurations

### Step 3: Create Your .env File

```bash
# Copy template
cp .env.example .env

# Edit with your values (example)
# On Windows:
notepad .env

# On Mac/Linux:
nano .env
# or
code .env
```

**Minimum required for local development:**
```bash
NODE_ENV=development
POSTGRES_HOST=localhost
POSTGRES_PASSWORD=postgres
JWT_SECRET=your_secret_minimum_32_characters_long
```

### Step 4: Verify Configuration

```bash
# Check TypeScript configuration
npx tsc --version

# Check ESLint configuration
npx eslint --version

# Check Prettier configuration
npx prettier --version

# Check Turbo configuration
npx turbo --version
```

All commands should succeed without errors.

---

## 🔧 IDE Setup

### VS Code

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "editorconfig.editorconfig",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### IntelliJ / WebStorm

1. **Enable ESLint:**
   - Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
   - Check "Automatic ESLint configuration"

2. **Enable Prettier:**
   - Settings → Languages & Frameworks → JavaScript → Prettier
   - Check "On save"

3. **Enable EditorConfig:**
   - Already enabled by default

---

## 🧪 Testing Configuration

### Verify ESLint Works

```bash
# Create a test file with an error
echo "const unused = 'test'" > test.ts

# Run ESLint
npx eslint test.ts

# Should show: 'unused' is assigned a value but never used

# Clean up
rm test.ts
```

### Verify Prettier Works

```bash
# Create messy code
echo "const x={a:1,b:2,c:3}" > test.ts

# Format it
npx prettier --write test.ts

# Check result (should be formatted nicely)
cat test.ts

# Clean up
rm test.ts
```

### Verify TypeScript Works

```bash
# Create TypeScript file
cat > test.ts << 'EOF'
const greet = (name: string): string => {
  return `Hello, ${name}!`;
};
console.log(greet('World'));
EOF

# Compile it
npx tsc test.ts

# Should create test.js

# Clean up
rm test.ts test.js
```

---

## 📝 Customizing Configuration

### Change Prettier Rules

Edit `.prettierrc`:

```json
{
  "semi": false,          // No semicolons
  "singleQuote": false,   // Double quotes
  "printWidth": 120       // Longer lines
}
```

### Add ESLint Rules

Edit `.eslintrc.js`:

```javascript
module.exports = {
  // ... existing config
  rules: {
    // Add your custom rules
    'no-console': 'error',        // Disallow console.log
    'prefer-const': 'error'       // Prefer const over let
  }
}
```

### Adjust TypeScript Strictness

Edit `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,              // Keep strict
    "noUnusedLocals": false,     // Allow unused variables
    "noUnusedParameters": false  // Allow unused params
  }
}
```

---

## 🐛 Troubleshooting

### "Module not found" errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### ESLint not working

```bash
# Check ESLint config
npx eslint --print-config src/index.ts

# If errors, reinstall ESLint
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### Prettier not formatting

```bash
# Check Prettier config
npx prettier --check src/**/*.ts

# Format all files
npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}"
```

### TypeScript errors

```bash
# Verify TypeScript is installed
npx tsc --version

# Check configuration
npx tsc --showConfig

# Clean build
rm -rf dist
npx tsc
```

---

## ✅ Configuration Checklist

- [ ] All 9 config files created
- [ ] `npm install` completed successfully
- [ ] `.env` file created from `.env.example`
- [ ] ESLint runs without errors
- [ ] Prettier formats code correctly
- [ ] TypeScript compiles successfully
- [ ] Turbo commands work (`npx turbo run build`)
- [ ] IDE extensions installed (VS Code/IntelliJ)
- [ ] Git ignores node_modules and .env

---

## Next Steps

1. ✅ Configuration files set up
2. 📁 Create workspace folders (apps, services, packages)
3. 🔨 Create your first service
4. 🧪 Add tests
5. 🚀 Start development

See [QUICK_START.md](./QUICK_START.md) for the next steps!
