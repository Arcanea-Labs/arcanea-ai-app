export function operatorSnapshot(
  request: Request,
  scope: "assets" | "releases",
  env?: Record<string, string | undefined>,
): Promise<Response>;
