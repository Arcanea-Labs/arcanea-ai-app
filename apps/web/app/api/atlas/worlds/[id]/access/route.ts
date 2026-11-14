import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { atlasRpc } from '@/lib/atlas/store';
import { boundedJson } from '@/lib/atlas/http';
const Action = z.discriminatedUnion('action', [
  z.object({ action:z.literal('grant-view'),userId:z.string().uuid(),role:z.enum(['reader','character','author']),characterId:z.string().nullable(),maxChapter:z.number().int().min(0).max(10000) }).strict(),
  z.object({ action:z.literal('consent-self-location'),entityId:z.string().min(1).max(160),longitude:z.number().min(-180).max(180),latitude:z.number().min(-90).max(90),precision:z.enum(['coarse','precise']),expiresAt:z.string().datetime() }).strict(),
  z.object({ action:z.literal('revoke-self-location'),entityId:z.string().min(1).max(160) }).strict(),
]);
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}) {
  const {id}=await context.params;
  if(request.headers.get('origin')!==request.nextUrl.origin||!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Invalid origin or world'},{status:403});
  let input;try{input=Action.safeParse(await boundedJson(request,4096));}catch{return NextResponse.json({error:'Invalid request body'},{status:400});}
  if(!input.success)return NextResponse.json({error:'Invalid access request'},{status:400});
  const a=input.data;
  const result=a.action==='grant-view'?await atlasRpc('atlas_grant_view',{p_world:id,p_user:a.userId,p_role:a.role,p_character:a.characterId,p_max_chapter:a.maxChapter}):a.action==='consent-self-location'?await atlasRpc('atlas_set_self_location',{p_world:id,p_entity:a.entityId,p_lon:a.longitude,p_lat:a.latitude,p_precision:a.precision,p_expires:a.expiresAt}):await atlasRpc('atlas_revoke_self_location',{p_world:id,p_entity:a.entityId});
  if(result.error)return NextResponse.json({error:'Request denied or invalid'},{status:result.error.code==='42501'?403:400});
  return NextResponse.json({status:'saved'},{headers:{'Cache-Control':'private, no-store'}});
}
