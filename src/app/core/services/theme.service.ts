import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private _theme = new BehaviorSubject<Theme>('dark');
    theme$ = this._theme.asObservable();

    constructor() {
        this.initTheme();
    }

    private initTheme() {
        // Check local storage or system preference
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            // Default to dark or check system
            // const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            // this.setTheme(prefersDark ? 'dark' : 'light');
            this.setTheme('dark'); // Default for this app
        }
    }

    setTheme(theme: Theme) {
        this._theme.next(theme);
        localStorage.setItem('theme', theme);

        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }

    getCurrentTheme(): Theme {
        return this._theme.value;
    }
}
