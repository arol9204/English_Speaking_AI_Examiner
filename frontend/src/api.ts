async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    let detail = response.statusText;
    try {
      detail = (await response.json()).detail ?? detail;
    } catch {
      /* not JSON */
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};

/** Fetch a new item, avoiding the ones already seen in this browser session. */
export function fetchItem<T>(task: string, level?: string): Promise<T> {
  const key = `seen:${task}`;
  let seen: string[] = [];
  try {
    seen = JSON.parse(sessionStorage.getItem(key) ?? "[]");
  } catch {
    /* storage unavailable */
  }
  const params = new URLSearchParams({ exclude: seen.join(",") });
  if (level) params.set("level", level);
  return request<T & { id: string }>(`/api/items/${task}?${params}`).then((item) => {
    try {
      sessionStorage.setItem(key, JSON.stringify([...seen, item.id].slice(-50)));
    } catch {
      /* storage unavailable */
    }
    return item;
  });
}
