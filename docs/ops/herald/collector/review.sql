-- Return the last recorded slot even when the feed is stale or empty.
WITH observed AS (
  SELECT max((metadata->>'slot_utc')::timestamptz) AS last_slot
  FROM public.campaign_signals
  WHERE platform = 'artblocks' AND metadata->>'schema' = 'arcanea.collector.sample.v1'
)
SELECT last_slot, CASE WHEN last_slot IS NULL THEN 'no_sample'
  WHEN now() >= last_slot + interval '6 hours 30 minutes' THEN 'overdue'
  ELSE 'within_interval' END AS collection_health
FROM observed;

-- Only compare records for an identical chain/project at exactly 24 hours.
-- A project falling out of the most-recently-activated sample ends its coverage.
WITH samples AS (
  SELECT (metadata->>'slot_utc')::timestamptz AS slot, metadata->'projects' AS projects
  FROM public.campaign_signals
  WHERE platform = 'artblocks' AND metadata->>'schema' = 'arcanea.collector.sample.v1'
), latest AS (
  SELECT * FROM samples ORDER BY slot DESC LIMIT 1
), prior AS (
  SELECT s.* FROM samples s JOIN latest l ON s.slot = l.slot - interval '24 hours'
)
SELECT l.slot, current_project->>'id' AS project_id, current_project->>'name' AS project,
  (current_project->>'invocations')::bigint AS observed_mints,
  (current_project->>'max_invocations')::bigint AS observed_cap,
  CASE WHEN (current_project->>'invocations')::bigint >= (old_project->>'invocations')::bigint
    THEN (current_project->>'invocations')::bigint - (old_project->>'invocations')::bigint
  END AS net_mints_24h,
  CASE WHEN p.slot IS NULL THEN 'previous_slot_missing'
       WHEN old_project IS NULL THEN 'outside_previous_sample'
       WHEN (current_project->>'invocations')::bigint < (old_project->>'invocations')::bigint THEN 'counter_revision'
       ELSE 'paired' END AS comparison
FROM latest l CROSS JOIN LATERAL jsonb_array_elements(l.projects) current_project
LEFT JOIN prior p ON true
LEFT JOIN LATERAL jsonb_array_elements(p.projects) old_project
  ON old_project->>'id' = current_project->>'id'
ORDER BY net_mints_24h DESC NULLS LAST, project_id;
