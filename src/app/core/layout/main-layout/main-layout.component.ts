import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { ThemeService, Theme } from '../../services/theme.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit, OnDestroy {

  isCollapsed = false;
  private resizeListener: () => void;

  constructor(
    private authService: AuthService,
    private router: Router,
    private profileService: ProfileService,
    private themeService: ThemeService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    // Initial check
    this.isCollapsed = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

    // Bind resize listener
    this.resizeListener = () => {
      // Only auto-collapse if we shrink below 768px and aren't already collapsed
      if (window.innerWidth < 768 && !this.isCollapsed) {
        this.isCollapsed = true;
        this.cdr.detectChanges();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.resizeListener);
    }
  }

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.profileService.getProfile(user.id).subscribe(profile => {
          if (profile) {
            // Apply User Preferences
            if (profile.language) {
              this.translate.use(profile.language);
            }
            if (profile.theme) {
              this.themeService.setTheme(profile.theme as Theme);
            }
          }
        });
      }
    });
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.cdr.detectChanges(); // Force update
  }

  closeSidebar() {
    if (window.innerWidth < 768) {
      this.isCollapsed = true;
      this.cdr.detectChanges();
    }
  }

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
