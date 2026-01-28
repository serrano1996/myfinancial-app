import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { Session } from '@supabase/supabase-js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'myfinancial-app';

  isInitialized = false;

  constructor(private translate: TranslateService, private authService: AuthService) {
    this.translate.setDefaultLang('es');
    this.translate.use('es');

    // Wait for auth session to be determined (undefined means still loading)
    this.authService.session$.subscribe((session: Session | null | undefined) => {
      if (session !== undefined) {
        this.isInitialized = true;
      }
    });
  }
}
