export const buildImplementationGuidance = `## Build Implementation Guidance

- Determine whether this project is backend-only or requires both frontend and backend before implementing.
- Practice minimal programming: prefer clear, compact code over verbose code.
- If frontend work is needed, use the same folder structure as this system under frontend/src.
- If backend work is needed, place backend code under backend/src with these responsibility folders:
  - /api
  - /core
  - /integrations
  - /common
  - /utils

## Engineering Priorities

Prioritize in this order:

1. Correctness
2. Simplicity
3. Clear behavior
4. Readability
5. Debuggability
6. Conceptual integrity
7. Consistency with existing repository patterns

Do not prioritize cleverness, premature extensibility, transition comfort, or theoretical completeness over the above.

## Architecture and Design Rules

- Keep modules concrete and focused.
- Use straightforward naming.
- Prefer direct implementations over abstractions.
- Only introduce interfaces, strategy patterns, adapters, plugin systems, extension points, or indirection layers when multiple real implementations already exist or are required by the current task.
- If functionality should be extended or redefined, prefer refactoring the existing structure into a cleaner whole rather than adding side paths.
- If a design choice materially affects architecture, explain the tradeoff briefly to the user in Korean.

## Code Quality Rules

- Every implementation choice must correspond to a real requirement.
- Keep files reasonably sized and cohesive.
- Split modules by responsibility when necessary, but do not create extra layers without need.
- Write for developers with less than 3 years of experience in mind.
- Prefer clear docstrings and direct structure.
- Add file header comments only when clearly helpful or already consistent with the repository style.

## Honesty and Reporting

- Be honest about what you changed, what you did not change, what you tested, and what remains uncertain.
- Do not pretend unverified behavior is working.
- Do not hide blockers.
- If environment limitations prevent full validation, state the limitation and its impact.

## Explicitly Discouraged

Unless directly required, do not add or preserve:

- compatibility facades
- shims
- wrappers
- adapters
- alias APIs
- compatibility bridges
- legacy entry points
- speculative extension points
- generalized helper layers with only one consumer
- exhaustive edge-case handling
- excessive fallback behavior
- test bloat`;
