import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-csv-import-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="modal-overlay" *ngIf="visible">
      <div class="modal-container">
        <div class="modal-header">
           <h2>{{ 'TRANSACTIONS.IMPORT_MODAL.TITLE' | translate }}</h2>
           <button class="close-btn" (click)="onCancel()">×</button>
        </div>
        <div class="modal-body">
            <p style="color: var(--text-muted); margin-bottom: 1rem;">{{ 'TRANSACTIONS.IMPORT_MODAL.INSTRUCTION' | translate }}</p>
            <input type="file" (change)="onFileSelected($event)" accept=".csv">
        </div>
        <div class="modal-footer">
            <button class="btn btn-text" (click)="onCancel()">{{ 'COMMON.CANCEL' | translate }}</button>
            <button class="btn btn-primary" (click)="onUpload()">{{ 'TRANSACTIONS.IMPORT_MODAL.UPLOAD_BUTTON' | translate }}</button>
        </div>
      </div>
    </div>
  `,
  // Sharing styles from modal
  styleUrl: '../transaction-form-modal/transaction-form-modal.component.css'
})
export class CsvImportModalComponent {
  @Input() visible = false;
  @Output() cancel = new EventEmitter<void>();
  @Output() import = new EventEmitter<File>();

  selectedFile: File | null = null;

  onCancel() {
    this.cancel.emit();
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onUpload() {
    if (this.selectedFile) {
      this.import.emit(this.selectedFile);
    }
  }
}
