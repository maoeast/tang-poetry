export const AUTH_COOKIE_NAME = "tang-poetry-session";
export const AUTH_COOKIE_VALUE = "verified";

export function normalizeNextPath(nextPath: string) {
  if (!nextPath.startsWith("/")) {
    return "/";
  }

  if (nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}
