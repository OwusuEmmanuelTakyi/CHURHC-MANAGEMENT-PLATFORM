-- ============================================================================
-- GHAMSU Manager — Migration 003
-- Private storage bucket for staged bulk-import files (Task 3).
-- All access goes through the service-role client in API routes, which
-- bypasses storage RLS, so no additional storage.objects policies are needed.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('imports', 'imports', false)
on conflict (id) do nothing;
