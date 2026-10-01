-- New profiles are always created as 'member'.
--
-- The previous version read the role from raw_app_meta_data. That never
-- worked: Supabase Auth (auth.admin.createUser) inserts the auth.users row
-- first and writes app_metadata in a later UPDATE, so this AFTER INSERT
-- trigger never saw the role and every invited admin became a member.
--
-- The role is now set by trusted server code after the user is created
-- (src/app/(auth)/invite/[token]/actions.ts), with the secret key.

-- security definer (unchanged): runs as a trigger on auth.users, where the
-- calling role cannot write to public.profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'display_name'
  );
  return new;
end;
$$;
