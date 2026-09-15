import { z } from 'zod';

export const profileSchema = z.object({
  registration_number: z.string().trim().min(5).max(50),
  phone: z.string().trim().min(10).max(20),
  year: z.coerce.number().int().min(1).max(5),
  branch: z.string().trim().min(2).max(100),
});

export function validateProfilePayload(payload) {
  return profileSchema.safeParse(payload);
}
