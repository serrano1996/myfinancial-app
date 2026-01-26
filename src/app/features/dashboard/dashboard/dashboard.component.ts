import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { AuthService } from '../../../core/services/auth.service';
import { AccountsService } from '../../../core/services/accounts.service';
import { TransactionsService } from '../../../core/services/transactions.service';
import { User } from '@supabase/supabase-js';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
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

  recentActivity = []; // heatmap data placeholder or list

  constructor(
    private authService: AuthService,
    private accountsService: AccountsService,
    private transactionsService: TransactionsService,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadDashboardData();
      }
    });

    // Translate chart labels on language change
    this.translate.onLangChange.subscribe(() => {
      this.updateChartLabels();
    });
  }

  updateChartLabels() {
    // Re-assign data to trigger change detection if needed or just update labels
    // Ideally fetching translations for 'Income' and 'Expense' again
    const incomeLabel = this.translate.instant('DASHBOARD.INCOME');
    const expenseLabel = this.translate.instant('DASHBOARD.EXPENSES');

    this.barChartData.labels = [incomeLabel, expenseLabel];
    // For Doughnut, labels come from keys, maybe need to translate them if they are static, 
    // but here they are dynamic category names. 
    // If we want to translate category names, we need a map or translation keys for categories.
    // For now, let's just update the bar chart static labels.

    // Force update
    this.barChartData = { ...this.barChartData };
  }

  loadDashboardData() {
    if (!this.user) return;
    this.loading = true;

    // Load Accounts (for Balance)
    this.accountsService.getAccounts(this.user.id).subscribe(accounts => {
      this.totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    });

    // Load Recent Transactions (for Charts) - Fetching last 100 or specific range
    this.transactionsService.getTransactions(this.user.id, 0, 100).subscribe(response => {
      const txs = response.data;

      // Calculate Totals (Basic aggregation of fetched txs, ideally fetch dedicated stats endpoint)
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

      this.loading = false;
    });
  }
}
