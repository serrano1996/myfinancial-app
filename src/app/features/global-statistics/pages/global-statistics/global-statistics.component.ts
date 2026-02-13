import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, ChartType, registerables } from 'chart.js';
import { Subscription, forkJoin, of, catchError, finalize } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { User } from '@supabase/supabase-js';
import Swal from 'sweetalert2';

import { AuthService } from '../../../../core/services/auth.service';
import { TransactionsService } from '../../../../core/services/transactions.service';
import { AccountsService } from '../../../../core/services/accounts.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { ChartConfigurationService } from '../../../../core/services/chart-configuration.service';
import { Tables } from '../../../../types/supabase';

Chart.register(...registerables);

interface CustomChart {
  id: string;
  title: string;
  type: ChartType;
  config: any;
  data: ChartData;
  options: ChartConfiguration['options'];
  loading: boolean;
}

@Component({
  selector: 'app-global-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective, TranslateModule],
  templateUrl: './global-statistics.component.html',
  styleUrl: './global-statistics.component.css',
})
export class GlobalStatisticsComponent implements OnInit, OnDestroy {
  user: User | null = null;
  loading = false;

  // Filters
  startDate: string = '';
  endDate: string = '';
  selectedAccountId: string = '';
  selectedCategoryId: string = '';
  selectedChartType: ChartType = 'bar'; // For the main view, default or user selection

  // Dropdown Data
  accounts: any[] = [];
  categories: any[] = [];

  // Metrics
  // Removed metrics as requested by user

  // Main Charts
  // Removed default charts

  // Custom Charts
  customCharts: CustomChart[] = [];

  private subscriptions: Subscription = new Subscription();

  // Wizard State
  showModal = false;
  currentStep = 1;
  newChartConfig = {
    dataType: 'expense', // income, expense, savings
    scope: 'all', // all, account, category
    selectedId: '', // accountId or categoryId
    grouping: 'total', // total, month, year
    type: 'bar' as ChartType,
    title: ''
  };

  constructor(
    private authService: AuthService,
    private transactionsService: TransactionsService,
    private accountsService: AccountsService,
    private categoriesService: CategoriesService,
    private chartConfigService: ChartConfigurationService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.startDate = firstDay.toISOString().split('T')[0];
    this.endDate = lastDay.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.subscriptions.add(this.authService.user$.subscribe(user => {
      this.user = user;
      if (user) {
        this.loadInitialData();
        this.loadCustomCharts();
      }
    }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadInitialData() {
    if (!this.user) return;
    this.loading = true;
    console.log('Loading initial data...');

    forkJoin({
      accounts: this.accountsService.getAccounts(this.user.id),
      categories: this.categoriesService.getCategories(this.user.id)
    }).pipe(
      finalize(() => {
        this.loading = false;
        console.log('Initial data loaded (finalize). Loading:', this.loading);
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        console.log('Initial data receive:', data);
        this.accounts = data.accounts;
        this.categories = data.categories;
      },
      error: (err) => console.error('Error loading initial data', err)
    });
  }

  // --- Wizard Logic ---

  openWizard() {
    this.showModal = true;
    this.currentStep = 1;
    this.newChartConfig = {
      dataType: 'expense',
      scope: 'all',
      selectedId: '',
      grouping: 'total',
      type: 'bar',
      title: ''
    };
  }

  closeWizard() {
    this.showModal = false;
  }

  nextStep() {
    this.currentStep++;
  }

  prevStep() {
    this.currentStep--;
  }

  selectDataType(type: string) {
    this.newChartConfig.dataType = type;
  }

  selectScope(scope: string, id: string = '') {
    this.newChartConfig.scope = scope;
    this.newChartConfig.selectedId = id;
  }

  selectGrouping(grouping: string) {
    this.newChartConfig.grouping = grouping;
  }

  selectChartType(type: ChartType) {
    this.newChartConfig.type = type;
  }

  saveWizardChart() {
    if (!this.user || !this.newChartConfig.title) return;

    // Construct the config object expected by backend/renderer
    const config: any = {
      dataType: this.newChartConfig.dataType,
      scope: this.newChartConfig.scope,
      selectedId: this.newChartConfig.selectedId,
      grouping: this.newChartConfig.grouping,
      // We can also store dates if we want them locked, or dynamic
      // For now, let's keep it dynamic based on current view date?
      // Or maybe the user wants "This Year", "Last Month", etc.
      // Based on previous implementation, let's use the current view dates as default
      startDate: this.startDate,
      endDate: this.endDate
    };

    const newChart: any = {
      user_id: this.user.id,
      title: this.newChartConfig.title,
      type: this.newChartConfig.type,
      config: config
    };

    this.chartConfigService.createChartConfiguration(newChart).subscribe({
      next: () => {
        this.loadCustomCharts();
        this.closeWizard();
        Swal.fire({
          icon: 'success',
          title: 'Saved!',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      },
      error: (err) => console.error('Error saving chart', err)
    });
  }

  // --- Custom Charts Logic ---

  loadCustomCharts() {
    if (!this.user) return;

    this.chartConfigService.getChartConfigurations(this.user.id).subscribe({
      next: (configs) => {
        this.customCharts = configs.map(cfg => ({
          id: cfg.id,
          title: cfg.title,
          type: cfg.type as ChartType,
          config: cfg.config,
          data: { labels: [], datasets: [] },
          options: this.getChartOptions(cfg.type as ChartType),
          loading: true
        }));
        console.log('Loaded custom charts:', this.customCharts);
        this.customCharts.forEach(chart => this.loadCustomChartData(chart));
      },
      error: (err) => console.error('Error loading custom charts', err)
    });
  }

  loadCustomChartData(chart: CustomChart) {
    if (!this.user) return;

    // Determine dynamic dates based on grouping
    let startDate = chart.config.startDate || this.startDate;
    let endDate = chart.config.endDate || this.endDate;
    const grouping = chart.config.grouping || 'total';

    if (grouping === 'month') {
      // For monthly trend, show the current year by default
      const now = new Date();
      startDate = `${now.getFullYear()}-01-01`;
      endDate = `${now.getFullYear()}-12-31`;
    } else if (grouping === 'year') {
      // For yearly trend, show last 10 years to be safe
      const now = new Date();
      startDate = `${now.getFullYear() - 9}-01-01`;
      endDate = `${now.getFullYear()}-12-31`;
    }

    const filters: any = {
      startDate: startDate,
      endDate: endDate
    };

    // Apply scope filters
    if (chart.config.scope === 'account') {
      filters.accountId = chart.config.selectedId;
    } else if (chart.config.scope === 'category') {
      const parentId = chart.config.selectedId;

      // Find children
      const children = this.categories.filter(c => c.parent_id === parentId);
      const allIds = [parentId, ...children.map(c => c.id)];

      if (children.length > 0) {
        filters.categoryIds = allIds;
      } else {
        filters.categoryId = parentId;
      }
    }

    this.transactionsService.getTransactions(this.user.id, 0, 10000, filters).subscribe({
      next: (response) => {
        if (response.data && response.data.length > 0) {
          const sample = response.data[0] as any;
          console.log('Sample Transaction:', sample);
          console.log('Sample Category:', sample.categories);
        } else {
          // No transactions found
        }

        try {
          this.processCustomChartData(chart, response.data || []);
        } catch (e) {
          console.error('Error processing chart data:', e);
        } finally {
          chart.loading = false;
          this.cdr.detectChanges(); // Force update after processing
        }
      },
      error: (err) => {
        console.error(`Error loading transactions for chart ${chart.title}`, err);
        chart.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  processCustomChartData(chart: CustomChart, transactions: any[]) {
    // Check data type filter (Income, Expense, Savings)
    const targetType = chart.config.dataType || 'expense';
    const grouping = chart.config.grouping || 'total';

    console.log(`Processing chart ${chart.title}: Type=${targetType}, Grouping=${grouping}, Txs=${transactions.length}`);

    // Filter by type
    const filteredTxs = transactions.filter(tx => {
      // Cast to any because joined property 'categories' is not in standard Tables<'transactions'>
      const t = tx as any;
      if (!t.categories) return false;

      if (targetType === 'income') return t.categories.type === 'income';
      if (targetType === 'expense') return t.categories.type === 'expense';
      if (targetType === 'savings') return t.categories.type === 'savings';
      return false;
    });

    console.log(`Filtered Txs for ${chart.title}: ${filteredTxs.length}`);

    if (grouping === 'total') {
      this.processTotalGrouping(chart, filteredTxs);
    } else if (grouping === 'month') {
      this.processTimeGrouping(chart, filteredTxs, 'month');
    } else if (grouping === 'year') {
      this.processTimeGrouping(chart, filteredTxs, 'year');
    }
  }

  processTotalGrouping(chart: CustomChart, transactions: any[]) {
    let total = 0;
    const categoryMap = new Map<string, number>();

    transactions.forEach(tx => {
      try {
        if (!tx.amount) return;
        total += tx.amount;
        // Cast for category access
        const t = tx as any;
        const catName = t.categories?.name || 'Uncategorized';
        const current = categoryMap.get(catName) || 0;
        categoryMap.set(catName, current + tx.amount);
      } catch (e) {
        console.warn('Error processing transaction total', tx, e);
      }
    });

    console.log(`Chart ${chart.title} Total: ${total}, Categories: ${categoryMap.size}`);

    if (chart.type === 'doughnut') {
      chart.data = {
        labels: Array.from(categoryMap.keys()),
        datasets: [{
          data: Array.from(categoryMap.values()),
          backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
        }]
      };
    } else {
      // Bar/Line shows single total bar or category breakdown?
      // If doughnut, category breakdown is good.
      // If bar, maybe category breakdown too?
      // If grouping is TOTAL, bar chart usually means comparison of categories.
      chart.data = {
        labels: Array.from(categoryMap.keys()),
        datasets: [{
          data: Array.from(categoryMap.values()),
          backgroundColor: '#3b82f6',
          label: chart.title
        }]
      };
    }
  }

  processTimeGrouping(chart: CustomChart, transactions: any[], period: 'month' | 'year') {
    const timeMap = new Map<string, number>();

    transactions.forEach(tx => {
      try {
        if (!tx.date) return;
        const date = new Date(tx.date);
        if (isNaN(date.getTime())) return; // Invalid date

        let key = '';
        if (period === 'month') {
          // Use Spanish locale for consistency with the app, or current locale
          key = new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(date);
          // Capitalize first letter
          key = key.charAt(0).toUpperCase() + key.slice(1);
        } else {
          key = `${date.getFullYear()}`;
        }

        const current = timeMap.get(key) || 0;
        timeMap.set(key, current + tx.amount);
      } catch (e) {
        console.warn('Error processing transaction date', tx, e);
      }
    });

    // Sort keys chronologically? For now assuming input is roughly sorted or map order
    // Better to sort labels locally if needed, but Map insertion order usually works if processed in order
    // Let's sort keys properly
    const sortedKeys = Array.from(timeMap.keys()); // Simplified sort for now
    console.log(`Generated keys for ${chart.title}:`, sortedKeys);

    chart.data = {
      labels: sortedKeys,
      datasets: [{
        data: Array.from(timeMap.values()),
        backgroundColor: chart.type === 'line' ? 'rgba(59, 130, 246, 0.2)' : '#3b82f6',
        borderColor: '#3b82f6',
        fill: chart.type === 'line',
        label: chart.title
      }]
    };
  }

  getChartOptions(type: ChartType): ChartConfiguration['options'] {
    if (type === 'doughnut') {
      return {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }
      };
    }
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      },
      plugins: { legend: { display: false } }
    };
  }

  deleteCustomChart(id: string) {
    Swal.fire({
      title: this.translate.instant('COMMON.DELETE_CONFIRM'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('COMMON.DELETE'),
      cancelButtonText: this.translate.instant('COMMON.CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.chartConfigService.deleteChartConfiguration(id).subscribe(() => {
          this.loadCustomCharts();
          Swal.fire('Deleted!', '', 'success');
        });
      }
    });
  }
}
