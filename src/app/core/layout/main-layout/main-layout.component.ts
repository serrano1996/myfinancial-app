import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {

  isCollapsed = false;

  constructor(private authService: AuthService, private router: Router) { }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
