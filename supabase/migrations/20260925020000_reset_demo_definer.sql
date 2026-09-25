-- reset_demo() rewrites the associates table, which clients can only read (RLS).
-- Run it with its owner's rights so the in-app Reset button works; pin search_path for safety.
alter function public.reset_demo() security definer set search_path = '';
