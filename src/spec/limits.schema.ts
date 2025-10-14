import { z } from 'zod';

export const LimitsSchema = z.object({
  timeMs: z.number().int().min(50).max(30000),           
  wallTimeMs: z.number().int().min(50).max(60000).optional(),
  memoryMB: z.number().int().min(32).max(8192),
  stackMB: z.number().int().min(1).max(2048).optional(),
  procCount: z.number().int().min(1).max(8).default(1),
  outputKB: z.number().int().min(0).max(1024).optional(),
  noNetwork: z.literal(true).default(true)
}).refine(
  (v) => v.wallTimeMs === undefined || v.wallTimeMs >= v.timeMs,
  { message: 'wallTimeMs must be >= timeMs', path: ['wallTimeMs'] }
);

export type Limits = z.infer<typeof LimitsSchema>;
