-- ============================================================================
-- GHAMSU Manager — Migration 005
-- Private storage bucket for uploaded documents (Task 7).
-- Uploads go through a signed-upload-URL flow (server issues the URL with the
-- service-role client, browser uploads directly to Supabase Storage), and
-- downloads through a short-lived signed URL — so no storage.objects RLS
-- policies are needed here either.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
