import {zReplicateStatus} from "@/lib/validation/enums";
import {z} from 'zod';

export type ZReplicateStatus = z.infer<typeof zReplicateStatus>;