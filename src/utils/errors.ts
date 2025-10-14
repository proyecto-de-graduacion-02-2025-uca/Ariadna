import { ZodError } from 'zod';

export type Issue = { path: string; message: string; code?: string };

export function formatZodError(err: ZodError): Issue[] {
  return err.issues.map(i => ({
    path: i.path.join('.'),
    message: i.message,
    code: i.code
  }));
}


