/** Bound streaming bodies before buffering. A missing or dishonest Content-Length cannot evade the cap. */
export async function boundedJson(request: Request, maxBytes: number): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new Error('Body too large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > maxBytes) { await reader.cancel(); throw new Error('Body too large'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
