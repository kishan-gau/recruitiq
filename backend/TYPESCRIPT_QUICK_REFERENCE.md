# TypeScript Quick Reference for Backend Development

## Common Patterns and Fixes

### 1. Class Property Declarations

**Problem:** `TS2339: Property 'config' does not exist on type 'MyClass'`

```typescript
// ❌ Before (JavaScript style)
class MyService {
  constructor() {
    this.config = {};
    this.logger = null;
    this.isInitialized = false;
  }
}

// ✅ After (TypeScript style)
class MyService {
  config: any;              // or use proper type like ConfigType
  logger: any;              // or Logger type
  isInitialized: boolean;   // explicit boolean type
  
  constructor() {
    this.config = {};
    this.logger = null;
    this.isInitialized = false;
  }
}

// 🌟 Best Practice (with proper types)
interface ServiceConfig {
  apiUrl: string;
  timeout: number;
}

class MyService {
  private config: ServiceConfig;
  private logger: Logger | null;
  private isInitialized: boolean;
  
  constructor(config: ServiceConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || null;
    this.isInitialized = false;
  }
}
```

### 2. Function Parameter Types

**Problem:** `TS7006: Parameter 'req' implicitly has an 'any' type`

```typescript
// ❌ Before
export function createUser(req, res, next) {
  // ...
}

// ✅ Quick Fix (use any temporarily)
export function createUser(req: any, res: any, next: any) {
  // ...
}

// 🌟 Best Practice (proper Express types)
import { Request, Response, NextFunction } from 'express';

export function createUser(req: Request, res: Response, next: NextFunction) {
  // ...
}
```

### 3. Express Router Types

**Problem:** `TS2742: The inferred type of 'router' cannot be named`

```typescript
// ❌ Before
import express from 'express';
const router = express.Router();

// ✅ Fix
import express, { Router } from 'express';
const router: Router = express.Router();
```

### 4. Object Destructuring with Types

**Problem:** `TS2339: Property does not exist on type '{}'`

```typescript
// ❌ Before
function handleOptions(options = {}) {
  const { timeout, retries } = options;
}

// ✅ Quick Fix
function handleOptions(options: any = {}) {
  const { timeout, retries } = options;
}

// 🌟 Best Practice
interface Options {
  timeout?: number;
  retries?: number;
}

function handleOptions(options: Options = {}) {
  const { timeout = 5000, retries = 3 } = options;
}
```

### 5. Array and Object Types

```typescript
// Arrays
const users: any[] = [];
const numbers: number[] = [1, 2, 3];
const strings: string[] = ['a', 'b', 'c'];
const mixed: (string | number)[] = [1, 'a', 2, 'b'];

// Objects
const config: Record<string, any> = {};
const settings: { [key: string]: string } = {};

// 🌟 Best Practice - Define interfaces
interface User {
  id: string;
  name: string;
  email: string;
}

const users: User[] = [];
```

### 6. Async Function Return Types

```typescript
// ❌ Before
async function fetchData(id) {
  return await database.query('SELECT * FROM users WHERE id = $1', [id]);
}

// ✅ Quick Fix
async function fetchData(id: string): Promise<any> {
  return await database.query('SELECT * FROM users WHERE id = $1', [id]);
}

// 🌟 Best Practice
interface UserData {
  id: string;
  name: string;
  email: string;
}

async function fetchData(id: string): Promise<UserData | null> {
  const result = await database.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}
```

### 7. Try-Catch Error Handling

```typescript
// ❌ Before
try {
  // code
} catch (error) {
  console.error(error.message);  // Error: unknown type
}

// ✅ Fix
try {
  // code
} catch (error: any) {
  console.error(error.message);
}

// 🌟 Best Practice
try {
  // code
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### 8. Callback Functions

```typescript
// ❌ Before
function processItems(items, callback) {
  items.forEach(item => callback(item));
}

// ✅ Fix
function processItems(items: any[], callback: (item: any) => void) {
  items.forEach(item => callback(item));
}

// 🌟 Best Practice
interface Item {
  id: string;
  value: number;
}

function processItems(items: Item[], callback: (item: Item) => void): void {
  items.forEach(item => callback(item));
}
```

### 9. Express Middleware

```typescript
// ❌ Before
export function authenticate(req, res, next) {
  // middleware logic
}

// ✅ Quick Fix
export function authenticate(req: any, res: any, next: any) {
  // middleware logic
}

// 🌟 Best Practice
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // middleware logic with typed req.user access
}
```

### 10. Database Query Results

```typescript
// ❌ Before
async function getUser(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

// ✅ Quick Fix
async function getUser(id: string): Promise<any> {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

// 🌟 Best Practice
interface User {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

async function getUser(id: string): Promise<User | null> {
  const result: QueryResult<User> = await query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}
```

## Migration Workflow

### Step 1: Quick Fix for Compilation
```typescript
// Add `: any` to parameters and properties
function myFunction(param: any): any {
  // ...
}
```

### Step 2: Add Basic Types
```typescript
// Replace `any` with specific types
function myFunction(param: string): number {
  // ...
}
```

### Step 3: Create Interfaces
```typescript
// Define data structure interfaces
interface MyData {
  id: string;
  value: number;
}

function myFunction(data: MyData): boolean {
  // ...
}
```

### Step 4: Enable Strict Mode
```typescript
// In tsconfig.json, gradually enable:
// "strictNullChecks": true
// "noImplicitAny": true
// "strict": true
```

## Useful TypeScript Commands

```bash
# Check types without compiling
npm run typecheck

# Build with TypeScript
npm run build

# Watch mode for development
npm run build:watch

# Check migration status
node scripts/ts-migration-status.js

# Lint TypeScript files
npm run lint

# Fix auto-fixable lint issues
npm run lint:fix
```

## VSCode Tips

### Enable TypeScript in VSCode
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "TypeScript: Select TypeScript Version"
3. Choose "Use Workspace Version"

### Useful Keyboard Shortcuts
- `F12` - Go to definition
- `Alt+F12` - Peek definition
- `Shift+F12` - Find all references
- `Ctrl+Space` - Trigger autocomplete
- `Ctrl+Shift+Space` - Show parameter hints

### Quick Fixes
- Hover over error squiggles
- Click the lightbulb icon
- Or use `Ctrl+.` / `Cmd+.` for quick fixes

## Common Type Definitions

```typescript
// Utility types
type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type Maybe<T> = T | null | undefined;

// Database result wrapper
interface DbResult<T> {
  rows: T[];
  rowCount: number;
}

// API response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Pagination
interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Express with TypeScript](https://github.com/Microsoft/TypeScript-Node-Starter)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## Getting Help

1. Check error message carefully - often tells you exactly what's wrong
2. Use `any` as a temporary fix to keep moving
3. Look at similar files that compile successfully for patterns
4. Ask TypeScript-specific questions when stuck
5. Gradually improve types over time - don't try to perfect everything at once
