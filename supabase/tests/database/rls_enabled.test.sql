-- Guardrail: every table in the public schema must have Row Level Security.
-- Fails automatically when a migration adds a table without RLS.
begin;
create extension if not exists pgtap with schema extensions;

select plan(1);

select is_empty(
  $$
    select c.relname
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'Every table in public has Row Level Security enabled'
);

select * from finish();
rollback;
