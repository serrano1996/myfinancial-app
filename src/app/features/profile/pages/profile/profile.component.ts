import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { ThemeService, Theme } from '../../../../core/services/theme.service';
import { User } from '@supabase/supabase-js';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  user: User | null = null;
  loading = false;
  passwordLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  passwordSuccessMessage: string | null = null;
  passwordErrorMessage: string | null = null;
  showPasswordSection = false;

  currencies = [
    { code: 'EUR', label: 'PROFILE.CURRENCY_EUR' },
    { code: 'USD', label: 'PROFILE.CURRENCY_USD' },
    { code: 'GBP', label: 'PROFILE.CURRENCY_GBP' }
  ];

  languages = [
    { code: 'es', label: 'PROFILE.LANG_ES' },
    { code: 'en', label: 'PROFILE.LANG_EN' }
  ];

  themes = [
    { code: 'light', label: 'PROFILE.THEME_LIGHT' },
    { code: 'dark', label: 'PROFILE.THEME_DARK' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profileService: ProfileService,
    private translate: TranslateService,
    private themeService: ThemeService
  ) {
    this.profileForm = this.fb.group({
      fullName: [''],
      currency: ['EUR'],
      language: ['es'],
      theme: [this.themeService.getCurrentTheme()]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadProfile(user.id);
        if (user.user_metadata?.['full_name']) {
          this.profileForm.patchValue({ fullName: user.user_metadata['full_name'] });
        }
      }
    });

    // Listen to language changes
    this.profileForm.get('language')?.valueChanges.subscribe(lang => {
      this.translate.use(lang);
    });

    // Listen to theme changes
    this.profileForm.get('theme')?.valueChanges.subscribe(theme => {
      this.themeService.setTheme(theme as Theme);
    });
  }

  loadProfile(userId: string) {
    this.loading = true;
    this.profileService.getProfile(userId).subscribe({
      next: (profile) => {
        if (profile) {
          const currentTheme = this.themeService.getCurrentTheme();
          this.profileForm.patchValue({
            currency: profile.currency || 'EUR',
            language: profile.language || 'es',
            theme: profile.theme || currentTheme
          });
          // Ensure language is set on load
          if (profile.language) {
            this.translate.use(profile.language);
          }
          // Ensure theme is set on load (if different from default)
          if (profile.theme) {
            this.themeService.setTheme(profile.theme as Theme);
          }
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading profile', err);
        this.loading = false;
      }
    });
  }

  async onAvatarSelected(event: any) {
    if (!this.user) return;
    const file = event.target.files[0];
    if (!file) return;

    this.loading = true;
    try {
      const publicUrl = await this.authService.uploadAvatar(this.user.id, file);
      await this.authService.updateUser({
        data: { avatar_url: publicUrl }
      });
      this.successMessage = this.translate.instant('PROFILE.SUCCESS_AVATAR');
    } catch (error: any) {
      this.errorMessage = error.message;
    } finally {
      this.loading = false;
    }
  }

  updateProfile() {
    if (!this.user) return;

    this.loading = true;
    this.successMessage = null;
    this.errorMessage = null;

    const { fullName, ...prefs } = this.profileForm.value;

    // Update Auth Metadata (Name)
    this.authService.updateUser({ data: { full_name: fullName } })
      .then(() => {
        // Update DB Profile (Prefs)
        this.profileService.updateProfile(this.user!.id, prefs).subscribe({
          next: (response) => {
            if (response.error) {
              this.errorMessage = response.error.message;
            } else {
              this.successMessage = this.translate.instant('PROFILE.SUCCESS_PROFILE');
            }
            this.loading = false;
          },
          error: (err) => {
            this.errorMessage = err.message;
            this.loading = false;
          }
        });
      })
      .catch(err => {
        this.errorMessage = err.message;
        this.loading = false;
      });
  }

  async updatePassword() {
    if (this.passwordForm.invalid) return;
    if (!this.user || !this.user.email) return;

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.passwordErrorMessage = this.translate.instant('PROFILE.ERROR_PASSWORD_MATCH');
      return;
    }

    this.passwordLoading = true;
    this.passwordSuccessMessage = null;
    this.passwordErrorMessage = null;

    try {
      // 1. Verify current password by signing in
      const { error: signInError } = await this.authService.signIn(this.user.email, currentPassword);

      if (signInError) {
        throw new Error(this.translate.instant('PROFILE.ERROR_CURRENT_PASSWORD'));
      }

      // 2. Update password
      await this.authService.updateUser({ password: newPassword });

      this.passwordSuccessMessage = this.translate.instant('PROFILE.SUCCESS_PASSWORD');
      this.passwordForm.reset();
      this.showPasswordSection = false;

    } catch (err: any) {
      console.error(err);
      this.passwordErrorMessage = err.message || 'Error';
    } finally {
      this.passwordLoading = false;
    }
  }

  togglePasswordSection() {
    this.showPasswordSection = !this.showPasswordSection;
  }
}
