import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { AuthService } from '../../../core/services/auth.service';
import { AccountsService } from '../../../core/services/accounts.service';
import { TransactionsService } from '../../../core/services/transactions.service';
import { User } from '@supabase/supabase-js';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, forkJoin, of, timeout, catchError, finalize } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  user: User | null = null;
  loading = true;

  // Metrics
  totalBalance = 0;
  totalIncome = 0;
  totalExpense = 0;

  // Charts
  doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8' } }
    }
  };
  doughnutChartType: ChartType = 'doughnut';
  doughnutChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{ data: [] }]
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    },
    plugins: {
      legend: { display: false }
    }
  };
  barChartType: ChartType = 'bar';
  barChartData: ChartData<'bar'> = {
    labels: ['Income', 'Expense'],
    datasets: [
      { data: [0, 0], backgroundColor: ['#22c55e', '#ef4444'] }
    ]
  };

  recentActivity = [];

  private userSubscription: Subscription | null = null;
  private dataSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.userSubscription = this.authService.user$.subscribe(user => {
      // Only load if user changes or first load
      if (user && (!this.user || this.user.id !== user.id)) {
        this.user = user;
        this.loadDashboardData();
      } else {
        this.user = user;
      }
    });

    // Translate chart labels on language change
    this.translate.onLangChange.subscribe(() => {
      this.updateChartLabels();
    });
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  updateChartLabels() {
    const incomeLabel = this.translate.instant('DASHBOARD.INCOME');
    const expenseLabel = this.translate.instant('DASHBOARD.EXPENSES');

    this.barChartData.labels = [incomeLabel, expenseLabel];
    this.barChartData = { ...this.barChartData };
  }

  loadDashboardData() {
    if (!this.user) return;
    this.loading = true;

    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    this.dataSubscription = forkJoin({
      accounts: this.accountsService.getAccounts(this.user.id).pipe(catchError(() => of([]))),
      transactions: this.transactionsService.getTransactions(this.user.id, 0, 100).pipe(catchError(() => of({ data: [], count: 0 })))
    }).pipe(
      timeout(5000),
      catchError(err => {
        console.error('Dashboard load error or timeout', err);
        return of({ accounts: [], transactions: { data: [], count: 0 } });
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe(({ accounts, transactions }) => {
      // Process Accounts
      this.totalBalance = (accounts || []).reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0);

      // Process Transactions
      const txs = transactions?.data || [];
      let income = 0;
      let expense = 0;
      const categoryMap = new Map<string, number>();

      txs.forEach((tx: any) => {
        const amount = tx.amount;
        const type = tx.categories?.type;
        const catName = tx.categories?.name || 'Uncategorized';

        if (type === 'income') {
          income += amount;
        } else if (type === 'expense') {
          expense += amount;
          const current = categoryMap.get(catName) || 0;
          categoryMap.set(catName, current + amount);
        }
      });

      this.totalIncome = income;
      this.totalExpense = expense;

      // Update Charts
      this.barChartData = {
        labels: ['Income', 'Expense'],
        datasets: [
          { data: [income, expense], backgroundColor: ['#22c55e', '#ef4444'], borderColor: 'transparent', borderWidth: 0, borderRadius: 8 }
        ]
      };

      const catLabels = Array.from(categoryMap.keys());
      const catValues = Array.from(categoryMap.values());
      this.doughnutChartData = {
        labels: catLabels,
        datasets: [{
          data: catValues,
          backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
          borderWidth: 0
        }]
      };

      this.updateChartLabels(); // Ensure labels are correct
    });
  }
}
