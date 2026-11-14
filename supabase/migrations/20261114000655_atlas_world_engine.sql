-- Additive, private storage. No existing worlds, books, canon, or auth policies are changed.
create schema if not exists arcanea_atlas;
revoke all on schema arcanea_atlas from public, anon, authenticated;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_jsonschema with schema extensions;

create function arcanea_atlas.valid_record(p jsonb) returns boolean language sql immutable set search_path='' as $v$
 select case when extensions.jsonb_matches_schema('{"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"id":{"type":"string"},"logicalId":{"type":"string"},"revision":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"branchId":{"type":"string"},"validFrom":{"type":"number"},"validTo":{"type":["number","null"]},"recordedFrom":{"type":"string","format":"date-time","pattern":"^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"},"recordedTo":{"anyOf":[{"type":"string","format":"date-time","pattern":"^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"},{"type":"null"}]},"revealChapter":{"type":"integer","minimum":0,"maximum":9007199254740991},"chapterTitle":{"type":"string"},"chapterHref":{"type":["string","null"]},"title":{"type":"string"},"detail":{"type":"string"},"audience":{"type":"string","enum":["reader","character","author"]},"knownBy":{"type":"array","items":{"type":"string"}},"sourceIds":{"minItems":1,"type":"array","items":{"type":"string"}},"status":{"type":"string","enum":["approved","provisional","synthetic"]},"fact":{"oneOf":[{"type":"object","properties":{"kind":{"type":"string","const":"position"},"entityId":{"type":"string"},"locationId":{"type":"string"},"viaPortalId":{"type":"string"}},"required":["kind","entityId","locationId"],"additionalProperties":false},{"type":"object","properties":{"kind":{"type":"string","const":"assertion"},"entityId":{"type":"string"},"predicate":{"type":"string"},"value":{"type":"string"}},"required":["kind","entityId","predicate","value"],"additionalProperties":false},{"type":"object","properties":{"kind":{"type":"string","const":"observation"},"observerId":{"type":"string"},"entityId":{"type":"string"},"predicate":{"type":"string"},"value":{"type":"string"},"confidence":{"type":"number","minimum":0,"maximum":1}},"required":["kind","observerId","entityId","predicate","value","confidence"],"additionalProperties":false}]}},"required":["id","logicalId","revision","branchId","validFrom","validTo","recordedFrom","recordedTo","revealChapter","chapterTitle","chapterHref","title","detail","audience","knownBy","sourceIds","status","fact"],"additionalProperties":false}'::json,p) then
  ((p->>'validTo') is null or (p->>'validTo')::double precision>(p->>'validFrom')::double precision)
  and ((p->>'recordedTo') is null or (p->>'recordedTo')::timestamptz>(p->>'recordedFrom')::timestamptz)
 else false end;
$v$;
create function arcanea_atlas.valid_packet(p jsonb) returns boolean language sql immutable set search_path='' as $v$
 select case when extensions.jsonb_matches_schema('{"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"id":{"type":"string"},"namespace":{"type":"string","enum":["arcanea","starlight","simulation"]},"title":{"type":"string"},"synthetic":{"type":"boolean"},"sources":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string","minLength":1,"maxLength":160},"title":{"type":"string","maxLength":240},"uri":{"type":"string","maxLength":2000},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"locator":{"type":"string","maxLength":500},"synthetic":{"type":"boolean"},"revealChapter":{"default":0,"type":"integer","minimum":0,"maximum":9007199254740991},"audience":{"default":"reader","type":"string","enum":["reader","author"]}},"required":["id","title","uri","sha256","locator","synthetic","revealChapter","audience"],"additionalProperties":false}},"entities":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string","minLength":1,"maxLength":160},"namespace":{"type":"string","enum":["arcanea","starlight","simulation"]},"kind":{"type":"string","enum":["character","location","region","portal"]},"name":{"type":"string","maxLength":240},"summary":{"type":"string","maxLength":2000},"coordinate":{"anyOf":[{"oneOf":[{"type":"object","properties":{"system":{"type":"string","const":"local"},"frame":{"type":"string","minLength":1},"x":{"type":"number"},"y":{"type":"number"},"z":{"default":0,"type":"number"},"unit":{"type":"string","const":"m"}},"required":["system","frame","x","y","z","unit"],"additionalProperties":false},{"type":"object","properties":{"system":{"type":"string","const":"wgs84"},"longitude":{"type":"number","minimum":-180,"maximum":180},"latitude":{"type":"number","minimum":-90,"maximum":90},"altitude":{"type":"number"}},"required":["system","longitude","latitude"],"additionalProperties":false}]},{"type":"null"}]},"parentId":{"type":["string","null"]},"sourceIds":{"minItems":1,"maxItems":30,"type":"array","items":{"type":"string"}},"status":{"type":"string","enum":["approved","provisional","synthetic"]},"revealChapter":{"default":0,"type":"integer","minimum":0,"maximum":9007199254740991},"audience":{"default":"reader","type":"string","enum":["reader","author"]}},"required":["id","namespace","kind","name","summary","coordinate","parentId","sourceIds","status","revealChapter","audience"],"additionalProperties":false}},"branches":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"parentId":{"type":["string","null"]},"forkAt":{"type":["number","null"]},"revealChapter":{"default":0,"type":"integer","minimum":0,"maximum":9007199254740991},"audience":{"default":"reader","type":"string","enum":["reader","author"]}},"required":["id","name","parentId","forkAt","revealChapter","audience"],"additionalProperties":false}},"records":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"logicalId":{"type":"string"},"revision":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"branchId":{"type":"string"},"validFrom":{"type":"number"},"validTo":{"type":["number","null"]},"recordedFrom":{"type":"string","format":"date-time","pattern":"^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"},"recordedTo":{"anyOf":[{"type":"string","format":"date-time","pattern":"^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z))$"},{"type":"null"}]},"revealChapter":{"type":"integer","minimum":0,"maximum":9007199254740991},"chapterTitle":{"type":"string"},"chapterHref":{"type":["string","null"]},"title":{"type":"string"},"detail":{"type":"string"},"audience":{"type":"string","enum":["reader","character","author"]},"knownBy":{"type":"array","items":{"type":"string"}},"sourceIds":{"minItems":1,"type":"array","items":{"type":"string"}},"status":{"type":"string","enum":["approved","provisional","synthetic"]},"fact":{"oneOf":[{"type":"object","properties":{"kind":{"type":"string","const":"position"},"entityId":{"type":"string"},"locationId":{"type":"string"},"viaPortalId":{"type":"string"}},"required":["kind","entityId","locationId"],"additionalProperties":false},{"type":"object","properties":{"kind":{"type":"string","const":"assertion"},"entityId":{"type":"string"},"predicate":{"type":"string"},"value":{"type":"string"}},"required":["kind","entityId","predicate","value"],"additionalProperties":false},{"type":"object","properties":{"kind":{"type":"string","const":"observation"},"observerId":{"type":"string"},"entityId":{"type":"string"},"predicate":{"type":"string"},"value":{"type":"string"},"confidence":{"type":"number","minimum":0,"maximum":1}},"required":["kind","observerId","entityId","predicate","value","confidence"],"additionalProperties":false}]}},"required":["id","logicalId","revision","branchId","validFrom","validTo","recordedFrom","recordedTo","revealChapter","chapterTitle","chapterHref","title","detail","audience","knownBy","sourceIds","status","fact"],"additionalProperties":false}}},"required":["id","namespace","title","synthetic","sources","entities","branches","records"],"additionalProperties":false}'::json,p) then
  jsonb_array_length(p->'records')<=2000 and jsonb_array_length(p->'entities')<=2000 and jsonb_array_length(p->'branches')<=64
  and (select count(*)=count(distinct e->>'id') from jsonb_array_elements(p->'entities') e)
  and (select count(*)=count(distinct e->>'id') from jsonb_array_elements(p->'sources') e)
  and (select count(*)=count(distinct e->>'id') from jsonb_array_elements(p->'branches') e)
  and (select count(*)=count(distinct e->>'id') from jsonb_array_elements(p->'records') e)
  and not exists(select 1 from jsonb_array_elements(p->'records') r where not arcanea_atlas.valid_record(r))
  and not exists(select 1 from jsonb_array_elements(p->'records') r where
    not exists(select 1 from jsonb_array_elements(p->'branches') b where b->>'id'=r->>'branchId')
    or not exists(select 1 from jsonb_array_elements(p->'entities') e where e->>'id'=r->'fact'->>'entityId'))
 else false end;
$v$;
create table arcanea_atlas.world_packets (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 legacy_world_id uuid references public.worlds(id), revision integer not null default 1,
 document jsonb not null check (arcanea_atlas.valid_packet(document) and pg_column_size(document)<2097152),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table arcanea_atlas.view_grants (
 world_id uuid not null references arcanea_atlas.world_packets(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('reader','character','author')), character_id text,
 max_chapter integer not null default 0 check(max_chapter>=0), primary key(world_id,user_id),
 check(role<>'character' or character_id is not null)
);
create table arcanea_atlas.proposals (
 id uuid primary key default gen_random_uuid(), world_id uuid not null references arcanea_atlas.world_packets(id),
 proposed_by uuid not null references auth.users(id), base_revision integer not null,
 record jsonb not null, entity_snapshot jsonb not null, source_snapshot jsonb not null, content_hash text not null, status text not null default 'provisional' check(status in ('provisional','approved','rejected')),
 created_at timestamptz not null default now(), decided_by uuid references auth.users(id), decided_at timestamptz
);
-- Consent and spatial index are separate from fictional coordinates. No location is seeded.
create table arcanea_atlas.location_consents (
 world_id uuid not null references arcanea_atlas.world_packets(id), entity_id text not null,
 subject_id uuid not null references auth.users(id), purpose text not null check(purpose='atlas-display'),
 precision text not null check(precision in ('coarse','precise')), granted_at timestamptz not null,
 expires_at timestamptz not null, revoked_at timestamptz,
 point extensions.geography(Point,4326) not null, primary key(world_id,entity_id), check(expires_at>granted_at)
);
create index atlas_location_gist on arcanea_atlas.location_consents using gist(point);
create index atlas_proposals_world_status on arcanea_atlas.proposals(world_id,status);
alter table arcanea_atlas.world_packets enable row level security;
alter table arcanea_atlas.view_grants enable row level security;
alter table arcanea_atlas.proposals enable row level security;
alter table arcanea_atlas.location_consents enable row level security;
-- No table grants/policies: all access uses bounded RPCs. Definers have an empty search_path.

create function public.atlas_create_world(p_document jsonb, p_legacy_world uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if not arcanea_atlas.valid_packet(p_document) then raise exception 'Invalid world packet'; end if;
 if p_document->>'namespace' not in ('arcanea','starlight','simulation') or jsonb_typeof(p_document->'records')<>'array'
  or jsonb_typeof(p_document->'entities')<>'array' or jsonb_typeof(p_document->'sources')<>'array'
  or jsonb_typeof(p_document->'branches')<>'array' then raise exception 'Invalid world packet'; end if;
 if jsonb_array_length(p_document->'records')>2000 or jsonb_array_length(p_document->'entities')>2000 then raise exception 'World packet limit'; end if;
 -- Import cannot mint approval or import personal coordinates. The owner approves proposals separately.
 if exists(select 1 from jsonb_array_elements(p_document->'records') r where r->>'status' is distinct from 'provisional') then raise exception 'Imported assertions must be provisional'; end if;
 if exists(select 1 from jsonb_array_elements(p_document->'entities') e where e->>'namespace'<>p_document->>'namespace' or e->'coordinate'->>'system'='wgs84') then raise exception 'Namespace or consent boundary'; end if;
 if p_legacy_world is not null and not exists(select 1 from public.worlds where id=p_legacy_world and creator_id=auth.uid()) then raise exception 'World unavailable' using errcode='42501'; end if;
 insert into arcanea_atlas.world_packets(owner_id,legacy_world_id,document) values(auth.uid(),p_legacy_world,p_document) returning id into v_id;
 return v_id;
end $$;

create function public.atlas_world_context(p_world uuid, p_chapter integer, p_branch text, p_valid double precision, p_known timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w arcanea_atlas.world_packets; v_role text; v_character text; v_chapter integer;
 v_lineage jsonb; v_records jsonb; v_entities jsonb; v_sources jsonb; v_branches jsonb;
begin
 if auth.uid() is null then raise exception 'World unavailable' using errcode='42501'; end if;
 select * into w from arcanea_atlas.world_packets where id=p_world;
 if not found then raise exception 'World unavailable' using errcode='42501'; end if;
 if w.owner_id=auth.uid() then v_role:='author';v_chapter:=greatest(0,p_chapter);
 else
  select role,character_id,least(max_chapter,greatest(0,p_chapter)) into v_role,v_character,v_chapter from arcanea_atlas.view_grants where world_id=p_world and user_id=auth.uid();
  if not found then raise exception 'World unavailable' using errcode='42501'; end if;
 end if;
 select coalesce(jsonb_agg(b),'[]'::jsonb) into v_branches from jsonb_array_elements(w.document->'branches') b where v_role='author' or (coalesce(b->>'audience','reader')='reader' and coalesce((b->>'revealChapter')::integer,0)<=v_chapter);
 select coalesce(jsonb_agg(case when b->>'parentId' is not null and not exists(select 1 from jsonb_array_elements(v_branches) p where p->>'id'=b->>'parentId') then b||jsonb_build_object('parentId',null,'forkAt',null) else b end),'[]'::jsonb) into v_branches from jsonb_array_elements(v_branches) b;
 if not exists(select 1 from jsonb_array_elements(v_branches) b where b->>'id'=p_branch) then raise exception 'Unknown timeline'; end if;
 with recursive branches as(select b from jsonb_array_elements(w.document->'branches') b),
 ancestry as(
  select b,1e15::double precision cap,0 depth,array[b->>'id'] path from branches where b->>'id'=p_branch
  union all select parent.b,least(a.cap,(a.b->>'forkAt')::double precision),a.depth+1,a.path||(parent.b->>'id')
  from ancestry a join branches parent on parent.b->>'id'=a.b->>'parentId'
  where a.depth<32 and not (parent.b->>'id'=any(a.path))
 ) select jsonb_object_agg(b->>'id',jsonb_build_object('cap',cap,'depth',depth)) into v_lineage from ancestry;
 select coalesce(jsonb_agg(src),'[]'::jsonb) into v_sources from jsonb_array_elements(w.document->'sources') src where v_role='author' or (coalesce(src->>'audience','reader')='reader' and coalesce((src->>'revealChapter')::integer,0)<=v_chapter);
 select coalesce(jsonb_agg(e),'[]'::jsonb) into v_entities from jsonb_array_elements(w.document->'entities') e where v_role='author' or (e->>'status'<>'provisional' and coalesce(e->>'audience','reader')='reader' and coalesce((e->>'revealChapter')::integer,0)<=v_chapter and exists(select 1 from jsonb_array_elements(v_sources) src where (e->'sourceIds') ? (src->>'id')));
 with candidates as(
  select distinct on (r->>'branchId',r->>'logicalId') r from jsonb_array_elements(w.document->'records') r
  where v_lineage ? (r->>'branchId') and (r->>'validFrom')::double precision<=(v_lineage->(r->>'branchId')->>'cap')::double precision
   and (r->>'recordedFrom')::timestamptz<=p_known and ((r->>'recordedTo') is null or p_known<(r->>'recordedTo')::timestamptz)
  order by r->>'branchId',r->>'logicalId',(r->>'revision')::integer desc,r->>'id' desc
 ), overlay as (select distinct on(r->>'logicalId') r from candidates where (r->>'validFrom')::double precision<=p_valid and ((r->>'validTo') is null or p_valid<(r->>'validTo')::double precision) order by r->>'logicalId',(v_lineage->(r->>'branchId')->>'depth')::integer asc) select coalesce(jsonb_agg(r order by (r->>'validFrom')::double precision,r->>'id'),'[]'::jsonb) into v_records from overlay
 where exists(select 1 from jsonb_array_elements(v_branches) b where b->>'id'=r->>'branchId') and (r->>'validFrom')::double precision<=p_valid and ((r->>'validTo') is null or p_valid<(r->>'validTo')::double precision)
 and not exists(select 1 from jsonb_array_elements_text(r->'sourceIds') sid where not exists(select 1 from jsonb_array_elements(v_sources) src where src->>'id'=sid))
 and exists(select 1 from jsonb_array_elements(v_entities) e where e->>'id'=r->'fact'->>'entityId')
 and (r->'fact'->>'kind'<>'position' or exists(select 1 from jsonb_array_elements(v_entities) e where e->>'id'=r->'fact'->>'locationId'))
 and (r->'fact'->>'viaPortalId' is null or exists(select 1 from jsonb_array_elements(v_entities) e where e->>'id'=r->'fact'->>'viaPortalId'))
 and (r->'fact'->>'kind'<>'observation' or exists(select 1 from jsonb_array_elements(v_entities) e where e->>'id'=r->'fact'->>'observerId'))
 and (v_role='author' or (r->>'status'<>'provisional' and (r->>'revealChapter')::integer<=v_chapter and
  ((v_role='reader' and r->>'audience'='reader') or (v_role='character' and r->>'audience'<>'author' and (r->'knownBy') ? v_character))));
 with ids as(select r->'fact'->>'entityId' id from jsonb_array_elements(v_records) r
  union select r->'fact'->>'locationId' from jsonb_array_elements(v_records) r
  union select r->'fact'->>'observerId' from jsonb_array_elements(v_records) r
  union select r->'fact'->>'viaPortalId' from jsonb_array_elements(v_records) r)
 select coalesce(jsonb_agg((e-'parentId'-'coordinate'-'sourceIds')||jsonb_build_object(
  'sourceIds',coalesce((select jsonb_agg(sid) from jsonb_array_elements(e->'sourceIds') sid where exists(select 1 from jsonb_array_elements(v_sources) src where src->>'id'=sid#>>'{}')),'[]'::jsonb),
  'parentId',case when exists(select 1 from ids where id=e->>'parentId') then e->'parentId' else 'null'::jsonb end,
  'coordinate',case when w.document->>'namespace'='starlight' then coalesce((select jsonb_build_object('system','wgs84','longitude',extensions.st_x(c.point::extensions.geometry),'latitude',extensions.st_y(c.point::extensions.geometry)) from arcanea_atlas.location_consents c where c.world_id=p_world and c.entity_id=e->>'id' and c.subject_id=auth.uid() and c.revoked_at is null and c.granted_at<=now() and c.expires_at>now()),'null'::jsonb) else e->'coordinate' end
 )),'[]'::jsonb) into v_entities from jsonb_array_elements(v_entities) e where e->>'id' in (select id from ids);
 with ids as(select jsonb_array_elements_text(r->'sourceIds') id from jsonb_array_elements(v_records) r
 union select jsonb_array_elements_text(e->'sourceIds') from jsonb_array_elements(v_entities) e)
 select coalesce(jsonb_agg(s),'[]'::jsonb) into v_sources from jsonb_array_elements(v_sources) s where s->>'id' in(select id from ids);
 select coalesce(jsonb_agg(r||jsonb_build_object('knownBy',case when v_role='author' then r->'knownBy' else coalesce((select jsonb_agg(k) from jsonb_array_elements(r->'knownBy') k where exists(select 1 from jsonb_array_elements(v_entities) e where e->>'id'=k#>>'{}')),'[]'::jsonb) end)),'[]'::jsonb) into v_records from jsonb_array_elements(v_records) r;
 return jsonb_build_object('revision',w.revision,'principal',jsonb_build_object('role',v_role,'characterId',v_character,'maxChapter',v_chapter),
 'document',(w.document-'records'-'entities'-'sources'-'branches')||jsonb_build_object('records',v_records,'entities',v_entities,'sources',v_sources,'branches',v_branches));
end $$;

create function public.atlas_propose(p_world uuid,p_record jsonb,p_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w arcanea_atlas.world_packets; v_id uuid; v_hash text; v_entities jsonb; v_sources jsonb;
begin
 select * into w from arcanea_atlas.world_packets where id=p_world for update;
 if auth.uid() is null or w.id is null or not(w.owner_id=auth.uid() or exists(select 1 from arcanea_atlas.view_grants where world_id=p_world and user_id=auth.uid() and role='author')) then raise exception 'World unavailable' using errcode='42501'; end if;
 if w.revision<>p_revision then raise exception 'Revision conflict' using errcode='40001'; end if;
 if not arcanea_atlas.valid_record(p_record) or pg_column_size(p_record)>32768 or p_record->>'status' is distinct from 'provisional' or p_record->>'id' is null or p_record->'fact'->>'entityId' is null then raise exception 'Invalid proposal'; end if;
 if not exists(select 1 from jsonb_array_elements(w.document->'entities') e where e->>'id'=p_record->'fact'->>'entityId')
  or not exists(select 1 from jsonb_array_elements(w.document->'branches') b where b->>'id'=p_record->>'branchId') then raise exception 'Invalid proposal references'; end if;
 if jsonb_array_length(p_record->'sourceIds')=0 or exists(select 1 from jsonb_array_elements_text(p_record->'sourceIds') s where not exists(select 1 from jsonb_array_elements(w.document->'sources') v where v->>'id'=s)) then raise exception 'Source required'; end if;
 if (select count(*) from arcanea_atlas.proposals where world_id=p_world and status='provisional')>=100 then raise exception 'Outstanding proposal limit'; end if;
 select coalesce(jsonb_agg(e),'[]'::jsonb) into v_entities from jsonb_array_elements(w.document->'entities') e
 where e->>'id' in (p_record->'fact'->>'entityId',p_record->'fact'->>'locationId',p_record->'fact'->>'observerId',p_record->'fact'->>'viaPortalId');
 select coalesce(jsonb_agg(src),'[]'::jsonb) into v_sources from jsonb_array_elements(w.document->'sources') src
 where (p_record->'sourceIds') ? (src->>'id') or exists(select 1 from jsonb_array_elements(v_entities) e where (e->'sourceIds') ? (src->>'id'));
 v_hash:=encode(extensions.digest(jsonb_build_object('record',p_record,'entities',v_entities,'sources',v_sources)::text,'sha256'),'hex');
 insert into arcanea_atlas.proposals(world_id,proposed_by,base_revision,record,entity_snapshot,source_snapshot,content_hash) values(p_world,auth.uid(),p_revision,p_record,v_entities,v_sources,v_hash) returning id into v_id;
 return jsonb_build_object('id',v_id,'status','provisional','contentHash',v_hash,'baseRevision',p_revision);
end $$;

create function public.atlas_review(p_world uuid,p_proposal uuid,p_hash text,p_revision integer,p_decision text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w arcanea_atlas.world_packets; p arcanea_atlas.proposals; v_record jsonb; v_records jsonb; v_entities jsonb; v_next integer; v_now timestamptz:=clock_timestamp();
begin
 select * into w from arcanea_atlas.world_packets where id=p_world for update;
 if auth.uid() is null or w.owner_id is distinct from auth.uid() then raise exception 'Owner approval required' using errcode='42501'; end if;
 select * into p from arcanea_atlas.proposals where id=p_proposal and world_id=p_world for update;
 if p.id is null or p.status<>'provisional' or p.content_hash<>p_hash or p.base_revision<>p_revision or w.revision<>p_revision then raise exception 'Proposal or revision conflict' using errcode='40001'; end if;
 if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
 if p_decision='approved' then
  select coalesce(max((r->>'revision')::integer),0)+1 into v_next from jsonb_array_elements(w.document->'records') r where r->>'logicalId'=p.record->>'logicalId' and r->>'branchId'=p.record->>'branchId';
  v_record:=(p.record-'status'-'recordedFrom'-'recordedTo'-'id'-'revision')||jsonb_build_object('id',p.record->>'id'||':approved:'||p.id::text,'revision',v_next,'status','approved','recordedFrom',to_char(v_now at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'recordedTo',null);
  select coalesce(jsonb_agg(case when r->>'logicalId'=p.record->>'logicalId' and r->>'branchId'=p.record->>'branchId' and r->>'recordedTo' is null then r||jsonb_build_object('recordedTo',to_char(v_now at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) else r end),'[]'::jsonb) into v_records from jsonb_array_elements(w.document->'records') r;
  select coalesce(jsonb_agg(case when exists(select 1 from jsonb_array_elements(p.entity_snapshot) pe where pe->>'id'=e->>'id') then e||jsonb_build_object('status','approved') else e end),'[]'::jsonb) into v_entities from jsonb_array_elements(w.document->'entities') e;
  update arcanea_atlas.world_packets set document=jsonb_set(jsonb_set(document,'{records}',v_records||jsonb_build_array(v_record)),'{entities}',v_entities),revision=revision+1,updated_at=v_now where id=p_world;
 end if;
 update arcanea_atlas.proposals set status=p_decision,decided_by=auth.uid(),decided_at=v_now where id=p_proposal;
 return jsonb_build_object('proposalId',p_proposal,'status',p_decision,'contentHash',p_hash,'decidedAt',v_now,'revision',p_revision+case when p_decision='approved' then 1 else 0 end);
end $$;

create function public.atlas_pending(p_world uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from arcanea_atlas.world_packets w where id=p_world and (owner_id=auth.uid() or exists(select 1 from arcanea_atlas.view_grants where world_id=p_world and user_id=auth.uid() and role='author'))) then raise exception 'World unavailable' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'record',record,'entitySnapshot',entity_snapshot,'sourceSnapshot',source_snapshot,'contentHash',content_hash,'baseRevision',base_revision,'status',status,'createdAt',created_at)) from (select * from arcanea_atlas.proposals where world_id=p_world and status='provisional' order by created_at,id limit 100) pending),'[]'::jsonb);
end $$;

-- Metered geographic query is private, bounded and consent-checked at query time.
create function public.atlas_nearby(p_world uuid,p_lon double precision,p_lat double precision,p_metres double precision)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from arcanea_atlas.world_packets where id=p_world and owner_id=auth.uid()) then raise exception 'World unavailable' using errcode='42501'; end if;
 if p_lon not between -180 and 180 or p_lat not between -90 and 90 or p_metres not between 0 and 50000 then raise exception 'Invalid geographic query'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('entityId',entity_id,'precision',precision)) from
  (select entity_id,precision from arcanea_atlas.location_consents where world_id=p_world and subject_id=auth.uid()
   and purpose='atlas-display' and revoked_at is null and granted_at<=now() and expires_at>now()
   and extensions.st_dwithin(point,extensions.st_setsrid(extensions.st_makepoint(p_lon,p_lat),4326)::extensions.geography,p_metres) limit 200) q),'[]'::jsonb);
end $$;

revoke all on function public.atlas_create_world(jsonb,uuid),public.atlas_world_context(uuid,integer,text,double precision,timestamptz),public.atlas_propose(uuid,jsonb,integer),public.atlas_review(uuid,uuid,text,integer,text),public.atlas_pending(uuid),public.atlas_nearby(uuid,double precision,double precision,double precision) from public,anon;
grant execute on function public.atlas_create_world(jsonb,uuid),public.atlas_world_context(uuid,integer,text,double precision,timestamptz),public.atlas_propose(uuid,jsonb,integer),public.atlas_review(uuid,uuid,text,integer,text),public.atlas_pending(uuid),public.atlas_nearby(uuid,double precision,double precision,double precision) to authenticated;

create function public.atlas_grant_view(p_world uuid,p_user uuid,p_role text,p_character text,p_max_chapter integer)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from arcanea_atlas.world_packets where id=p_world and owner_id=auth.uid()) then raise exception 'Owner approval required' using errcode='42501'; end if;
 if p_role not in ('reader','character','author') or p_role is null or p_max_chapter is null or p_max_chapter not between 0 and 10000 then raise exception 'Invalid view grant'; end if;
 if p_role='character' and not exists(select 1 from arcanea_atlas.world_packets w,jsonb_array_elements(w.document->'entities') e where w.id=p_world and e->>'id'=p_character and e->>'kind'='character') then raise exception 'Unknown character'; end if;
 insert into arcanea_atlas.view_grants(world_id,user_id,role,character_id,max_chapter) values(p_world,p_user,p_role,p_character,p_max_chapter)
 on conflict(world_id,user_id) do update set role=excluded.role,character_id=excluded.character_id,max_chapter=excluded.max_chapter;
end $$;
create function public.atlas_set_self_location(p_world uuid,p_entity text,p_lon double precision,p_lat double precision,p_precision text,p_expires timestamptz)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from arcanea_atlas.world_packets w,jsonb_array_elements(w.document->'entities') e where w.id=p_world and w.owner_id=auth.uid() and w.document->>'namespace'='starlight' and e->>'id'=p_entity) then raise exception 'Private real-world entity required' using errcode='42501'; end if;
 if p_precision is null or p_precision not in ('coarse','precise') or p_lon is null or p_lat is null or p_lon not between -180 and 180 or p_lat not between -90 and 90 or p_expires is null or p_expires<=now() or p_expires>now()+interval '24 hours' then raise exception 'Invalid scoped location consent'; end if;
 if p_precision='coarse' then p_lon:=round(p_lon::numeric,1);p_lat:=round(p_lat::numeric,1);end if;
 insert into arcanea_atlas.location_consents(world_id,entity_id,subject_id,purpose,precision,granted_at,expires_at,point)
 values(p_world,p_entity,auth.uid(),'atlas-display',p_precision,now(),p_expires,extensions.st_setsrid(extensions.st_makepoint(p_lon,p_lat),4326)::extensions.geography)
 on conflict(world_id,entity_id) do update set subject_id=auth.uid(),precision=excluded.precision,granted_at=now(),expires_at=excluded.expires_at,point=excluded.point,revoked_at=null;
end $$;
create function public.atlas_revoke_self_location(p_world uuid,p_entity text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 -- Nullify access at the source immediately. Point retained only in the private consent record.
 update arcanea_atlas.location_consents set revoked_at=now() where world_id=p_world and entity_id=p_entity and subject_id=auth.uid();
end $$;
revoke all on function public.atlas_grant_view(uuid,uuid,text,text,integer),public.atlas_set_self_location(uuid,text,double precision,double precision,text,timestamptz),public.atlas_revoke_self_location(uuid,text) from public,anon;
grant execute on function public.atlas_grant_view(uuid,uuid,text,text,integer),public.atlas_set_self_location(uuid,text,double precision,double precision,text,timestamptz),public.atlas_revoke_self_location(uuid,text) to authenticated;
