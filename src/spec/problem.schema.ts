import { z } from 'zod';
import { LimitsSchema } from './limits.schema';
import { CheckerSchema } from './checker.schema';
import { SampleCaseSchema, TestCaseSchema } from './testCases.schema';

const SemverLike = z.string().regex(/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/);

const IOStyle = z.enum(['stdin-stdout', 'file']);

export const ProblemSpecSchema = z.object({

    id: z.string().min(1),
    title: z.string().min(1),
    source: z.string().min(1),                  
    version: SemverLike,
    statement: z.string().min(1),              

    io: z.object({
        style: IOStyle.default('stdin-stdout'),
        inputSpec: z.string().min(1),
        outputSpec: z.string().min(1),
        fileIO: z.object({
        inFile: z.string().min(1),
        outFile: z.string().min(1)
        }).optional()
    }).refine(v => v.style === 'stdin-stdout' || !!v.fileIO, {
        message: 'fileIO must be provided when style is "file"',
        path: ['fileIO']
    }),

    limits: LimitsSchema,


    allowedLanguages: z.array(z.enum(['cpp17', 'python3'])).optional(),

    dataset: z.object({
        samples: z.array(SampleCaseSchema).min(1),
        tests: z.array(TestCaseSchema).min(1)
    }),

    checker: CheckerSchema,

    tags: z.array(z.string()).optional(),
    difficulty: z.enum(['easy','medium','hard']).optional()
})
.superRefine((spec, ctx) => {

    if (spec.checker.type === 'standard' || spec.checker.type === 'floats') {
        const missing = spec.dataset.tests.findIndex(t => !t.out);
        if (missing !== -1) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `test[${missing}] requires "out" for checker ${spec.checker.type}`,
            path: ['dataset','tests', missing, 'out'],
        });
        }
    }

    if (spec.checker.type === 'floats') {
        const hasTol = spec.checker.rel !== undefined
                    || spec.checker.abs !== undefined
                    || spec.checker.ulp !== undefined;
        if (!hasTol) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'floats checker requires at least one tolerance (rel/abs/ulp)',
            path: ['checker'],
        });
        }
    }

    if (spec.checker.type === 'interactive' && spec.io.style === 'file') {
        ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'interactive problems must use stdin-stdout style',
        path: ['io','style'],
        });
    }
});


export type ProblemSpec = z.infer<typeof ProblemSpecSchema>;
