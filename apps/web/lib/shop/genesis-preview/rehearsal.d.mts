export function handleRehearsal(
  request: Request,
  environment?: NodeJS.ProcessEnv,
  appRoot?: string,
  catalogEdition?: {
    sku: string;
    title: string;
    description: string;
    license: string;
  },
): Promise<Response>;
