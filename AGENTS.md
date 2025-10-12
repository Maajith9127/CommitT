# Agent Guidelines for Mono Repository

## Build/Lint/Test Commands
- **Lint & Format**: `bun run check` (Biome with Ultracite rules)
- **Build All**: `bun run build` (Turbo monorepo build)
- **Type Check**: `bun run check-types` (TypeScript across all workspaces)
- **Web Dev**: `bun run dev:web` (Vite dev server on port 3001)
- **Native Dev**: `bun run dev:native` (Expo development)
- **Backend Dev**: `bun run dev:server` (Convex development server)
- **Single Test**: No test framework configured yet - add tests with Vitest or similar

## Code Style Guidelines
- **Formatting**: Biome with Ultracite configuration (strict, zero-config)
- **TypeScript**: Strict mode enabled, no implicit any, no unused variables/parameters
- **Imports**: Named imports preferred, absolute paths with `@/` alias, `import type` for types
- **Naming**: camelCase for variables/functions, PascalCase for components/React hooks
- **Functions**: Arrow functions preferred, explicit return types
- **Variables**: `const` preferred, no `var`, minimize `let`
- **Error Handling**: Try/catch with descriptive error messages, avoid console.log in production
- **React**: Functional components with hooks, proper dependency arrays, no prop drilling
- **Accessibility**: Strict a11y compliance required (ARIA, semantic HTML, keyboard navigation)
- **Comments**: None unless absolutely necessary for complex business logic

## Cursor/Copilot Rules
Follow all Ultracite rules from `.cursor/rules/ultracite.mdc` and `.github/copilot-instructions.md`:
- Maximum type safety, zero configuration, subsecond performance
- Strict accessibility standards, AI-friendly code generation
- No TypeScript enums, no `any` types, no non-null assertions
- Arrow functions, optional chaining, object spread preferred
- Comprehensive error handling, no console/debugger in production