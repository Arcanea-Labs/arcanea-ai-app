-- 1. Book rating stats never updated. update_book_rating_stats() runs as the
--    rater, and the books UPDATE policy only admits the book's authors, so the
--    trigger's UPDATE matched zero rows for every reader's rating. Run it as
--    the owner instead; it only writes aggregates derived from book_ratings.
alter function public.update_book_rating_stats() security definer;
alter function public.update_book_rating_stats() set search_path = public, pg_temp;
revoke execute on function public.update_book_rating_stats() from public, anon, authenticated;

-- Recompute once so existing books reflect ratings already stored.
update public.books b set
  star_average = s.avg_stars,
  rating_count = s.n
from (
  select bk.id,
         (select avg(stars)::numeric(3,2) from public.book_ratings r where r.book_id = bk.id and r.is_hidden = false) as avg_stars,
         (select count(*) from public.book_ratings r where r.book_id = bk.id and r.is_hidden = false) as n
  from public.books bk
) s
where s.id = b.id;

-- 2. Authors could set their own book's tier, star_average, rating_count,
--    view_count and guardian_score. apps/web only reads these columns
--    (lib/dashboard/queries.ts); triggers and server code maintain them.
revoke insert, update on public.books from anon, authenticated;
grant insert (slug, title, subtitle, description, tagline, status, cover_id, tags, genre,
              content_rating, license, total_word_count, chapter_count, ai_metadata,
              acknowledgments, published_at)
  on public.books to authenticated;
grant update (slug, title, subtitle, description, tagline, status, cover_id, tags, genre,
              content_rating, license, total_word_count, chapter_count, ai_metadata,
              acknowledgments, published_at, updated_at)
  on public.books to authenticated;
