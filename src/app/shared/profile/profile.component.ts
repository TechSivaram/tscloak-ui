import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { z } from 'zod';
import { PortalApiService } from '../../core/api/portal-api.service';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters.'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'New password and confirmation password do not match.',
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password.',
  });

type ChangePasswordForm = {
  currentPassword: FormControl<string>;
  newPassword: FormControl<string>;
  confirmPassword: FormControl<string>;
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly api = inject(PortalApiService);

  readonly profile = signal<any>(null);
  readonly savingPassword = signal(false);
  readonly passwordMessage = signal('');
  readonly passwordError = signal('');
  readonly passwordChanged = signal(false);

  readonly passwordForm = new FormGroup<ChangePasswordForm>({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  readonly client = signal(location.pathname.includes('/idp-client-admin/'));

  get dashboardLink(): string {
    return this.client() ? '/idp-client-admin/dashboard' : '/idp-admin/dashboard';
  }



  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    const response = await this.api.request<any>('/api/account/profile');
    if (response.ok) {
      this.profile.set(response.data);
    }
  }

  get name(): string {
    const profile = this.profile();
    return profile?.displayName || profile?.username || 'Profile';
  }

  get initials(): string {
    return (
      this.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0])
        .join('')
        .toUpperCase() || 'AD'
    );
  }

  get passwordValidationMessage(): string {
    const values = this.passwordForm.getRawValue();
    const result = changePasswordSchema.safeParse(values);

    if (result.success) {
      return '';
    }

    return result.error.issues[0]?.message ?? 'Please check the password fields.';
  }

  async changePassword(): Promise<void> {
    this.passwordMessage.set('');
    this.passwordError.set('');
    this.passwordChanged.set(false);

    this.passwordForm.markAllAsTouched();

    const values = this.passwordForm.getRawValue();
    const parsed = changePasswordSchema.safeParse(values);

    if (!parsed.success) {
      this.passwordError.set(parsed.error.issues[0]?.message ?? 'Please check the password fields.');
      return;
    }

    this.savingPassword.set(true);

    try {
      const response = await this.api.request<{ message?: string }>('/api/account/change-password', {
        method: 'POST',
        body: parsed.data,
      });

      if (!response.ok) {
        this.passwordError.set(this.getApiError(response.data) || this.passwordErrorForStatus(response.status));
        return;
      }

      this.passwordForm.reset();
      this.passwordChanged.set(true);
      this.passwordMessage.set(response.data?.message || 'Password changed successfully');
    } finally {
      this.savingPassword.set(false);
    }
  }

  private getApiError(data: unknown): string {
    if (!data || typeof data !== 'object') {
      return '';
    }

    const body = data as Record<string, unknown>;
    const message = body['message'];

    if (Array.isArray(message)) {
      return message.filter((item): item is string => typeof item === 'string').join(' ');
    }

    return typeof message === 'string' ? message : '';
  }

  private passwordErrorForStatus(status: number): string {
    if (status === 400) {
      return 'The new password and confirmation password must match, and the new password must differ from the current password.';
    }

    if (status === 401) {
      return 'The current password is incorrect or the session is no longer valid.';
    }

    if (status === 403) {
      return 'Password changes are not available for this type of authenticated client.';
    }

    if (status === 404) {
      return 'The authenticated user could not be found or is disabled.';
    }

    return 'Unable to change the password. Please try again.';
  }
}
