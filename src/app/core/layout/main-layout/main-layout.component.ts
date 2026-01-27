import { Component, OnInit } from '@angular/core';
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
export class MainLayoutComponent implements OnInit {

  isCollapsed = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private profileService: ProfileService,
    private themeService: ThemeService,
    private translate: TranslateService
  ) {
    this.checkScreenSize();
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
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

  private checkScreenSize() {
    if (window.innerWidth < 768) {
      this.isCollapsed = true;
    } else {
      this.isCollapsed = false;
    }
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  closeSidebar() {
    if (window.innerWidth < 768) {
      this.isCollapsed = true;
    }
  }

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
