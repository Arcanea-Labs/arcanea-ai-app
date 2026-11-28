-- Production migration 20261109104311_fix_unread_notification_count on Supabase project hcfhyssdzphudaqatxbk.
-- Applied 2026-11-09 by Claude with Frank's approval; text as applied. Read-only record; do not edit.

alter function public.get_unread_notification_count() security invoker;
revoke execute on function public.get_unread_notification_count() from public, anon;
grant execute on function public.get_unread_notification_count() to authenticated;
