const BASE_URL = 'https://140.115.59.61:8003';

export async function prepareTask(fileName: string, fileLen: string, totalSegments: number) {
  const form = new FormData();
  form.append('file_len', fileLen);
  form.append('file_name', fileName);
  form.append('total_segments', String(totalSegments));
  console.debug('[api] prepareTask ->', { fileName, fileLen, totalSegments, url: `${BASE_URL}/api/prepare` });
  try {
    const res = await fetch(`${BASE_URL}/api/prepare`, { method: 'POST', body: form });
    const json = await res.json().catch(() => null);
    console.debug('[api] prepareTask response', res.status, json);
    if (!res.ok) throw new Error('prepare failed: ' + res.statusText);
    return json.data as string;
  } catch (err) {
    console.error('[api] prepareTask error', err);
    throw err;
  }
}

export async function uploadSegment(taskId: string, segmentId: number, segmentLen: string, file: Blob, filename = 'segment.wav') {
  const form = new FormData();
  form.append('task_id', taskId);
  form.append('segment_id', String(segmentId));
  form.append('segment_len', segmentLen);
  form.append('content', new File([file], filename, { type: 'audio/wav' }));
  console.debug('[api] uploadSegment ->', { taskId, segmentId, segmentLen, filename, url: `${BASE_URL}/api/upload` });
  try {
    const res = await fetch(`${BASE_URL}/api/upload`, { method: 'POST', body: form });
    const json = await res.json().catch(() => null);
    console.debug('[api] uploadSegment response', res.status, json);
    if (!res.ok) throw new Error('upload failed: ' + res.statusText);
    return json;
  } catch (err) {
    console.error('[api] uploadSegment error', err);
    throw err;
  }
}

export async function getResult(taskId: string) {
  const params = new URLSearchParams();
  params.append('task_id', taskId);
  console.debug('[api] getResult ->', { taskId, url: `${BASE_URL}/api/getResult`, contentType: 'application/x-www-form-urlencoded' });
  try {
    const res = await fetch(`${BASE_URL}/api/getResult`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    const text = await res.text().catch(() => '');
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
    console.debug('[api] getResult response', res.status, json ?? text);
    if (!res.ok) {
      const bodyMsg = json ? JSON.stringify(json) : text;
      console.error('[api] getResult error detail', { status: res.status, statusText: res.statusText, body: bodyMsg });
      throw new Error('getResult failed: ' + res.statusText + ' - ' + bodyMsg);
    }
    return json?.data ?? null;
  } catch (err) {
    console.error('[api] getResult error', err);
    throw err;
  }
}

export async function summarizeFromTask(taskId: string, language = 'en') {
  const form = new FormData();
  // some backends expect urlencoded form (application/x-www-form-urlencoded)
  const params = new URLSearchParams();
  params.append('task_id', taskId);
  params.append('language', language);

  console.debug('[api] summarizeFromTask ->', { taskId, language, url: `${BASE_URL}/v1/api/summarize`, contentType: 'application/x-www-form-urlencoded' });
  try {
    const res = await fetch(`${BASE_URL}/v1/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const text = await res.text().catch(() => '');
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
    console.debug('[api] summarizeFromTask response', res.status, json ?? text);

    if (!res.ok) {
      const bodyMsg = json ? JSON.stringify(json) : text;
      const err = new Error(`summarize failed: ${res.status} ${res.statusText} - ${bodyMsg}`);
      console.error('[api] summarizeFromTask error detail', { status: res.status, statusText: res.statusText, body: bodyMsg });
      throw err;
    }

    return json?.data ?? null;
  } catch (err) {
    console.error('[api] summarizeFromTask error', err);
    throw err;
  }
}

export async function getProgress(taskId: string) {
  const form = new URLSearchParams();
  form.append('task_id', taskId);
  console.debug('[api] getProgress ->', { taskId, url: `${BASE_URL}/api/getProgress` });
  try {
    const res = await fetch(`${BASE_URL}/api/getProgress`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
    const text = await res.text().catch(() => '');
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
    console.debug('[api] getProgress response', res.status, json ?? text);
    if (!res.ok) {
      const bodyMsg = json ? JSON.stringify(json) : text;
      throw new Error(`getProgress failed: ${res.status} ${res.statusText} - ${bodyMsg}`);
    }
    return json.data;
  } catch (err) {
    console.error('[api] getProgress error', err);
    throw err;
  }
}

const _default = { prepareTask, uploadSegment, getResult, summarizeFromTask };
export default _default;
