import { z } from 'zod';

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9_]{1,28}[a-z0-9])?$/;

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name too long'),
  username: z
    .string()
    .trim()
    .regex(
      USERNAME_PATTERN,
      'Username must be 3-30 characters: lowercase letters, digits or underscores'
    )
    .optional(),
  bio: z.string().trim().max(280, 'Bio must be at most 280 characters').optional().default(''),
  image: z.string().url('Image must be a valid URL').optional().or(z.literal('')),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;
export type ProfileUpdateOutput = z.output<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.input<typeof passwordChangeSchema>;
