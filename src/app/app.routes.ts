import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'register',
        loadComponent: () => import('./features/auth/pages/register/register.component').then(m => m.RegisterComponent)
    },
    {
        path: '',
        loadComponent: () => import('./core/layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'profile',
                loadComponent: () => import('./features/profile/pages/profile/profile.component').then(m => m.ProfileComponent)
            },
            {
                path: 'accounts',
                loadComponent: () => import('./features/accounts/pages/accounts-list/accounts-list.component').then(m => m.AccountsListComponent)
            },
            {
                path: 'categories',
                loadComponent: () => import('./features/categories/pages/categories-list/categories-list.component').then(m => m.CategoriesListComponent)
            },
            {
                path: 'transactions',
                loadComponent: () => import('./features/transactions/pages/transactions-list/transactions-list.component').then(m => m.TransactionsListComponent)
            },
            {
                path: 'statistics',
                loadComponent: () => import('./features/global-statistics/pages/global-statistics').then(m => m.GlobalStatisticsComponent)
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    }
];
