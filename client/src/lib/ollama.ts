export type OllamaTag = {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
};

export type OllamaProcess = {
  name: string;
  model?: string;
  size?: number;
  size_vram?: number;
  digest?: string;
  details?: OllamaTag["details"];
  expires_at?: string;
};

export type PullProgress = {
  status: string;
  completed?: number;
  total?: number;
  digest?: string;
  progress: number;
};

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";

function normalizeUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

async function ollamaFetch<T>(url: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${normalizeUrl(url)}${path}`, init);
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Ollama returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchOllamaTags(url = DEFAULT_OLLAMA_URL, signal?: AbortSignal) {
  const data = await ollamaFetch<{ models?: OllamaTag[] }>(url, "/api/tags", { signal });
  return data.models ?? [];
}

export async function fetchOllamaProcesses(url = DEFAULT_OLLAMA_URL, signal?: AbortSignal) {
  const data = await ollamaFetch<{ models?: OllamaProcess[] }>(url, "/api/ps", { signal });
  return data.models ?? [];
}

export async function pullOllamaModel(
  url: string,
  model: string,
  onProgress: (progress: PullProgress) => void,
  signal?: AbortSignal,
) {
  const response = await fetch(`${normalizeUrl(url)}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, stream: true }),
    signal,
  });

  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Unable to pull ${model}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const readChunk = (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const payload = JSON.parse(line) as { status?: string; completed?: number; total?: number; digest?: string; error?: string };
      if (payload.error) throw new Error(payload.error);
      const progress = payload.total ? Math.round(((payload.completed ?? 0) / payload.total) * 100) : 0;
      onProgress({ status: payload.status ?? "downloading", completed: payload.completed, total: payload.total, digest: payload.digest, progress });
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    readChunk(decoder.decode(value, { stream: true }));
  }
  readChunk(decoder.decode());
  onProgress({ status: "success", progress: 100 });
}
