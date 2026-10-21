# @ghotok/ui

React components, styles and the API client shared by the website and the admin panel. Shipped as source (Next.js transpiles it, Vite handles JSX).

| Export                  | Contents                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `@ghotok/ui`            | `Alert`, `Spinner`, `Empty`, `StatusPill`, `Pager`, `Tabs` (server-safe), `Modal`, `Field` (client) |
| `@ghotok/ui/api`        | `createApiClient()` — token storage, `X-Lang`, typed `ApiError`, file download helpers              |
| `@ghotok/ui/biodata`    | `BiodataView`, `SectionForm`, `FieldInput`, problem-message helpers — all generated from the schema |
| `@ghotok/ui/styles.css` | Design tokens (light/dark, Bangla fonts), base styles, form and print styles                        |

Import the stylesheet once at the root of an app: `import '@ghotok/ui/styles.css';`
