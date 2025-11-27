# Task Completion Checklist

When completing a coding task in the goop project, follow this checklist to ensure quality and consistency.

## 1. Type Checking

Always run TypeScript type checking before considering a task complete:

```bash
# Check all packages
bun run typecheck

# Or check specific package
cd packages/backend && bun run typecheck
cd packages/frontend && bun run typecheck
```

Fix any TypeScript errors before proceeding.

## 2. Testing

Run tests to ensure no regressions:

```bash
# Run all tests
bun run test

# Or run specific package tests
cd packages/backend && bun test
cd packages/frontend && bun test
```

Note: Test coverage is currently minimal (Phases 1-6 complete, testing planned for Phase 11).

## 3. Build Verification

Verify the build succeeds:

```bash
# Build all packages
bun run build

# Or build specific package
cd packages/backend && bun run build
cd packages/frontend && bun run build
```

## 4. Database Migrations (If Schema Changed)

If you modified `packages/backend/src/db/schema.ts`:

```bash
cd packages/backend

# Generate migration files
bun run db:generate

# Review the generated SQL in src/db/migrations/

# Apply migrations to database
bun run db:migrate
```

## 5. Runtime Testing

For backend changes:
```bash
cd packages/backend
bun run dev
# Test the endpoint/functionality manually or via curl
curl http://localhost:3001/health
```

For frontend changes:
```bash
cd packages/frontend
bun run dev
# Open http://localhost:3000 and test the UI
```

For full stack changes:
```bash
# From root, start both
bun run dev
# Test the complete flow in browser
```

## 6. Code Review Checklist

### Security
- [ ] File paths validated (stay within working directory)
- [ ] User input validated with Zod schemas
- [ ] No sensitive data in error messages
- [ ] No hardcoded secrets or API keys

### Error Handling
- [ ] Try/catch blocks for async operations
- [ ] Descriptive error messages
- [ ] Proper error propagation

### Code Quality
- [ ] Follows naming conventions (camelCase, PascalCase, etc.)
- [ ] Comments added for non-obvious logic
- [ ] No unused imports or variables
- [ ] TypeScript types are appropriate (not using `any` unless necessary)

### Documentation
- [ ] Update CLAUDE.md if adding new patterns or major features
- [ ] Update README.md if changing user-facing behavior
- [ ] Add JSDoc comments for public APIs

## 7. Git Commit

If everything passes:

```bash
git status
git add .
git commit -m "feat: descriptive message about what changed"
# Or: fix:, refactor:, docs:, test:, chore:, etc.
```

## 8. Linting (Frontend Only)

For frontend changes, run ESLint:

```bash
cd packages/frontend
bun run lint
```

Fix any linting errors or warnings.

## Common Issues & Fixes

### TypeScript Errors
- Check for missing imports
- Verify types are properly exported/imported
- Ensure `tsconfig.json` settings are correct

### Database Connection Issues
- Verify PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in `.env`
- Ensure migrations are applied: `bun run db:migrate`

### Port Conflicts
- Backend (3001): `lsof -i :3001` and kill if needed
- Frontend (3000): `lsof -i :3000` and kill if needed
- PostgreSQL (5432): `docker-compose restart`

### Build Failures
- Clear `dist/` directory and rebuild
- Delete `node_modules/` and run `bun install`
- Check for syntax errors in code

## Future Enhancements

When testing infrastructure is added (Phase 11):
- [ ] Unit tests pass with 90%+ coverage
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] No console warnings or errors in browser
- [ ] Performance benchmarks within acceptable range
