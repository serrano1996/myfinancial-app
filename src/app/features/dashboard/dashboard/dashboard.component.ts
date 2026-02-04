import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);
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

  // Month/Year Filter
  selectedMonth: number;
  selectedYear: number;
  monthNames: string[] = [];

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
  ) {
    // Initialize with current month and year
    const now = new Date();
    this.selectedMonth = now.getMonth(); // 0-11
    this.selectedYear = now.getFullYear();
    this.updateMonthNames();
  }

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

    // Translate chart labels and month names on language change
    this.translate.onLangChange.subscribe(() => {
      this.updateChartLabels();
      this.updateMonthNames();
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

  updateMonthNames() {
    this.monthNames = [
      this.translate.instant('DASHBOARD.MONTHS.JANUARY'),
      this.translate.instant('DASHBOARD.MONTHS.FEBRUARY'),
      this.translate.instant('DASHBOARD.MONTHS.MARCH'),
      this.translate.instant('DASHBOARD.MONTHS.APRIL'),
      this.translate.instant('DASHBOARD.MONTHS.MAY'),
      this.translate.instant('DASHBOARD.MONTHS.JUNE'),
      this.translate.instant('DASHBOARD.MONTHS.JULY'),
      this.translate.instant('DASHBOARD.MONTHS.AUGUST'),
      this.translate.instant('DASHBOARD.MONTHS.SEPTEMBER'),
      this.translate.instant('DASHBOARD.MONTHS.OCTOBER'),
      this.translate.instant('DASHBOARD.MONTHS.NOVEMBER'),
      this.translate.instant('DASHBOARD.MONTHS.DECEMBER')
    ];
  }

  getMonthDateRange(): { startDate: string; endDate: string } {
    const startDate = new Date(this.selectedYear, this.selectedMonth, 1);
    const endDate = new Date(this.selectedYear, this.selectedMonth + 1, 0, 23, 59, 59);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  previousMonth() {
    if (this.selectedMonth === 0) {
      this.selectedMonth = 11;
      this.selectedYear--;
    } else {
      this.selectedMonth--;
    }
    this.loadDashboardData();
  }

  nextMonth() {
    if (this.selectedMonth === 11) {
      this.selectedMonth = 0;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }
    this.loadDashboardData();
  }

  goToCurrentMonth() {
    const now = new Date();
    this.selectedMonth = now.getMonth();
    this.selectedYear = now.getFullYear();
    this.loadDashboardData();
  }

  isCurrentMonth(): boolean {
    const now = new Date();
    return this.selectedMonth === now.getMonth() && this.selectedYear === now.getFullYear();
  }

  loadDashboardData() {
    if (!this.user) return;
    this.loading = true;

    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    const dateRange = this.getMonthDateRange();

    this.dataSubscription = forkJoin({
      accounts: this.accountsService.getAccounts(this.user.id).pipe(catchError(() => of([]))),
      transactions: this.transactionsService.getTransactions(this.user.id, 0, 1000, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }).pipe(catchError(() => of({ data: [], count: 0 })))
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
      // Calculate balance as income minus expense for the selected month
      this.totalBalance = income - expense;

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
