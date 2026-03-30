export interface HttpRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
  headers?: Record<string, string>;
}

export const buildJsonHeaders = (
  headers: Record<string, string> = {}
): Record<string, string> => ({
  "Content-Type": "application/json",
  ...headers,
});
