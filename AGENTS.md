# Agent Guidelines for Mono Repository

## Build/Lint/Test Commands
- **Lint & Format**: `bun run check` (Biome with Ultracite rules)
- **Build All**: `bun run build` (Turbo monorepo build)
- **Type Check**: `bun run check-types` (TypeScript across workspaces)
- **Web Dev**: `bun run dev:web` (Vite on port 3001)
- **Native Dev**: `bun run dev:native` (Expo development)
- **Backend Dev**: `bun run dev:server` (Convex development)
- **Single Test**: No test framework yet - add Vitest when needed

## Code Style Guidelines
- **Formatting**: Biome with Ultracite (strict, zero-config)
- **TypeScript**: Strict mode, no implicit any, no unused vars/params
- **Imports**: Named imports, `@/` absolute paths, `import type` for types
- **Naming**: camelCase vars/functions, PascalCase components/hooks
- **Functions**: Arrow functions, explicit return types
- **Variables**: `const` preferred, no `var`, minimize `let`
- **Error Handling**: Try/catch with descriptive messages, no console.log in prod
- **React**: Functional components with hooks, proper deps, no prop drilling
- **Accessibility**: Strict a11y compliance (ARIA, semantic HTML, keyboard nav)
- **Comments**: None unless absolutely necessary for complex logic

## Cursor/Copilot Rules
Follow Ultracite rules from `.cursor/rules/ultracite.mdc` and `.github/copilot-instructions.md`:
- Maximum type safety, zero config, subsecond performance
- Strict accessibility standards, AI-friendly code generation
- No TS enums, no `any` types, no non-null assertions
- Arrow functions, optional chaining, object spread preferred
- Comprehensive error handling, no console/debugger in production