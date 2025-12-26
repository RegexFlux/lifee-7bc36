import {zAuthEmailCodePurpose} from "@/lib/validation/enums";
import {z} from 'zod';

export type AuthEmailCodePurpose = z.infer<typeof zAuthEmailCodePurpose>;