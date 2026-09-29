# Sprint 6 Theme Strategy

This frontend follows the style taxonomy approved for Purple Cubby:

- External UIs: glassmorphism via `.theme-external` token overrides.
- Core operational portals: skeuomorphic via `.theme-core` token overrides.
- Parent portal: neumorphic via `.theme-parent` token overrides (reserved for Sprint 7 screens).

Shared semantic tokens live in `app/globals.css`:

- Surfaces: `--background`, `--card`, `--surface2`, `--border`
- Typography and accents: `--foreground`, `--muted`, `--purple`, `--purple-dark`, `--accent`

Current Sprint 6 routes use the core theme:

- `/admin`
- `/principal`
- `/teacher`
- `/caregiver`
