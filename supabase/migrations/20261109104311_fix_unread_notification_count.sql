-- The 2026-08-10 privilege lockdown revoked EXECUTE on this SECURITY DEFINER
-- function from `authenticated`, so every badge poll returns 403
-- (331 failed calls on 2026-11-07, edge logs). Running it as the caller is
-- enough: notifications already has an owner-only SELECT policy
-- ("Users can view own notifications", user_id = auth.uid()).

alter function public.get_unread_notification_count() security invoker;

revoke execute on function public.get_unread_notification_count() from public, anon;
grant execute on function public.get_unread_notification_count() to authenticated;
