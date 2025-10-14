import { z } from 'zod';

export const AllowedRunnerLang = z.enum(['cpp17', 'python3']);
export type RunnerLanguage = z.infer<typeof AllowedRunnerLang>;

const FloatChecker = z.object({
  type: z.literal('floats'),
  rel: z.number().min(0).optional(),
  abs: z.number().min(0).optional(),
  ulp: z.number().min(0).optional()
});

const StandardChecker = z.object({
  type: z.literal('standard') 
});

const SpecialChecker = z.object({
  type: z.literal('special'),
  deterministic: z.boolean().default(true),
  exec: z.object({
    language: AllowedRunnerLang,
  
    source: z.string().min(1).optional(),
    path: z.string().min(1).optional()
  }).refine(e => !!e.source || !!e.path, { message: 'special checker: source or path required' })
});

const InteractiveChecker = z.object({
  type: z.literal('interactive'),
  protocol: z.string().min(1),      
  validator: z.object({
    language: AllowedRunnerLang,
    source: z.string().min(1)
  }).optional()
});

export const CheckerSchema = z.discriminatedUnion('type', [
  StandardChecker, FloatChecker, SpecialChecker, InteractiveChecker
]);

export type Checker = z.infer<typeof CheckerSchema>;
