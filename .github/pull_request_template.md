## What and why

<!-- Short description of the change and the reason for it. -->

## Checklist

- [ ] PR title follows Conventional Commits (`feat: ...`, `fix: ...`)
- [ ] `lint`, `format:check`, `typecheck` and `build` pass locally
- [ ] No secrets committed; new environment variables added to `.env.example`

### Only if the database changed

- [ ] New migration file (no merged migration edited)
- [ ] RLS enabled, explicit grants and policies on new tables
- [ ] `npx supabase db reset` works; types regenerated and committed
- [ ] Migration is backward compatible with the currently deployed code
