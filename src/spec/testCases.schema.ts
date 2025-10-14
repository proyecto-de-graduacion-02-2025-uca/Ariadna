import { z } from 'zod';

const CaseBase = z.object({
  in: z.string().min(1, 'input cannot be empty'),
  out: z.string().optional(),    
  id: z.string().optional(),
  weight: z.number().positive().optional()
});

export const SampleCaseSchema = CaseBase.extend({
  out: z.string().min(1, 'sample out is required')
});

export const TestCaseSchema = CaseBase;

export type SampleCase = z.infer<typeof SampleCaseSchema>;
export type TestCase = z.infer<typeof TestCaseSchema>;
