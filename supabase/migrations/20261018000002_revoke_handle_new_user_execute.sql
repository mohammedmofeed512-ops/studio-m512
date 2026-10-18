-- The signup trigger function must not be callable through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
