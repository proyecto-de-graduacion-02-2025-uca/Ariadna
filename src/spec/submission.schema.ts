import { z } from 'zod';

export const SubmissionSchema = z.object({
  language: z.enum(['cpp17']),
  source: z.string().min(1),
  compileFlags: z.array(z.string().regex(/^[-A-Za-z0-9_./+=,:]+$/)).max(16).optional(),
  runFlags: z.array(z.string().regex(/^[-A-Za-z0-9_./+=,:]+$/)).max(16).optional(),
  meta: z.record(z.string(), z.any()).optional()
});

export type Submission = z.infer<typeof SubmissionSchema>;
