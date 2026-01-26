import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { User } from '@supabase/supabase-js';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  user: User | null = null;
  loading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  currencies = [
    { code: 'EUR', label: 'Euro (€)' },
    { code: 'USD', label: 'US Dollar ($)' },
    { code: 'GBP', label: 'British Pound (£)' }
  ];

  languages = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' }
  ];

  themes = [
    { code: 'light', label: 'Light' },
    { code: 'dark', label: 'Dark' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profileService: ProfileService,
    private translate: TranslateService
  ) {
    this.profileForm = this.fb.group({
      currency: ['EUR'],
      language: ['es'],
      theme: ['light']
    });
  }

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadProfile(user.id);
      }
    });

    // Listen to language changes
    this.profileForm.get('language')?.valueChanges.subscribe(lang => {
      this.translate.use(lang);
    });
  }

  loadProfile(userId: string) {
    this.loading = true;
    this.profileService.getProfile(userId).subscribe({
      next: (profile) => {
        if (profile) {
          this.profileForm.patchValue({
            currency: profile.currency || 'EUR',
            language: profile.language || 'es',
            theme: profile.theme || 'light'
          });
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading profile', err);
        this.loading = false;
      }
    });
  }

  updateProfile() {
    if (!this.user) return;

    this.loading = true;
    this.successMessage = null;
    this.errorMessage = null;

    const updates = this.profileForm.value;

    this.profileService.updateProfile(this.user.id, updates).subscribe({
      next: (response) => {
        if (response.error) {
          this.errorMessage = response.error.message;
        } else {
          this.successMessage = 'Profile updated successfully';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.message;
        this.loading = false;
      }
    });
  }
}
