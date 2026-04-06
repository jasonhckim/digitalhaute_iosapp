import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

export function getApiUrl(): string {
  const host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    return "http://localhost:5000/";
  }

  if (host.startsWith("http://") || host.startsWith("https://")) {
    return host.endsWith("/") ? host : `${host}/`;
  }

  const isLocal = host.startsWith("localhost") || host.startsWith("127.") || host.startsWith("192.168.");
  const protocol = isLocal ? "http" : "https";

  return `${protocol}://${host}/`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function doApiRequest(
  method: string,
  url: URL,
  data: unknown | undefined,
  forceRefresh: boolean,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const token = await auth.currentUser?.getIdToken(forceRefresh);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  let res = await doApiRequest(method, url, data, false);

  if (res.status === 401 && auth.currentUser) {
    res = await doApiRequest(method, url, data, true);
  }

  await throwIfResNotOk(res);
  return res;
}

async function fetchWithToken(
  url: URL,
  forceRefresh: boolean,
): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = await auth.currentUser?.getIdToken(forceRefresh);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { headers });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    let res = await fetchWithToken(url, false);

    if (res.status === 401 && auth.currentUser) {
      res = await fetchWithToken(url, true);
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
