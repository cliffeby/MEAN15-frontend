import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { ConfigurationService } from '../../services/configuration.service';
import { AppConfig, ConfigSection, ConfigField } from '../../models/app-config.interface';

@Component({
  selector: 'app-admin-configuration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  template: `
    <div class="admin-configuration">
      <div class="header">
        <h1>
          <mat-icon>settings</mat-icon>
          Application Configuration
        </h1>
        <p class="subtitle">Configure application behavior and appearance</p>
      </div>

      <div class="actions-bar">
        <button mat-button color="warn" (click)="resetAllToDefaults()" 
                matTooltip="Reset all settings to default values">
          <mat-icon>restore</mat-icon>
          Reset All
        </button>
        
        <button mat-button color="primary" (click)="exportConfiguration()" 
                matTooltip="Export current configuration">
          <mat-icon>download</mat-icon>
          Export
        </button>
        
        <button mat-button color="primary" (click)="importConfiguration()" 
                matTooltip="Import configuration from file">
          <mat-icon>upload</mat-icon>
          Import
        </button>
      </div>

      <mat-tab-group class="config-tabs" [selectedIndex]="selectedTab" (selectedTabChange)="onTabChange($event)">
        <mat-tab *ngFor="let section of configSections" [label]="section.title">
          <ng-template matTabContent>
            <div class="tab-content">
              <div class="section-header">
                <mat-icon>{{ section.icon }}</mat-icon>
                <div>
                  <h2>{{ section.title }}</h2>
                  <p class="section-description">{{ section.description }}</p>
                </div>
                <button mat-icon-button color="warn" 
                        (click)="resetSectionToDefaults(section.key)"
                        matTooltip="Reset this section to defaults">
                  <mat-icon>restore</mat-icon>
                </button>
              </div>

              <div class="fields-grid">
                <mat-card *ngFor="let field of getFieldsForSection(section.key)" class="field-card">
                  <mat-card-content>
                    <div class="field-header">
                      <label class="field-label">{{ field.label }}</label>
                      <mat-icon *ngIf="field.description" 
                               class="info-icon" 
                               [matTooltip]="field.description">
                        info_outline
                      </mat-icon>
                    </div>

                    <!-- Number Input -->
                    <mat-form-field *ngIf="field.type === 'number'" appearance="outline" class="field-input">
                      <input matInput 
                             type="number" 
                             [formControlName]="getFieldControlName(section.key, field.key)"
                             [attr.min]="field.validation?.min || null"
                             [attr.max]="field.validation?.max || null">
                      <mat-error *ngIf="getFieldControl(section.key, field.key)?.hasError('required')">
                        This field is required
                      </mat-error>
                      <mat-error *ngIf="getFieldControl(section.key, field.key)?.hasError('min')">
                        Minimum value is {{ field.validation?.min }}
                      </mat-error>
                      <mat-error *ngIf="getFieldControl(section.key, field.key)?.hasError('max')">
                        Maximum value is {{ field.validation?.max }}
                      </mat-error>
                    </mat-form-field>

                    <!-- Boolean Toggle -->
                    <div *ngIf="field.type === 'boolean'" class="boolean-field">
                      <mat-slide-toggle [formControlName]="getFieldControlName(section.key, field.key)">
                        {{ getFieldControl(section.key, field.key)?.value ? 'Enabled' : 'Disabled' }}
                      </mat-slide-toggle>
                    </div>

                    <!-- String Input -->
                    <mat-form-field *ngIf="field.type === 'string'" appearance="outline" class="field-input">
                      <input matInput [formControlName]="getFieldControlName(section.key, field.key)">
                      <mat-error *ngIf="getFieldControl(section.key, field.key)?.hasError('required')">
                        This field is required
                      </mat-error>
                    </mat-form-field>

                    <!-- Select Dropdown -->
                    <mat-form-field *ngIf="field.type === 'select'" appearance="outline" class="field-input">
                      <mat-select [formControlName]="getFieldControlName(section.key, field.key)">
                        <mat-option *ngFor="let option of field.options" [value]="option.value">
                          {{ option.label }}
                        </mat-option>
                      </mat-select>
                    </mat-form-field>

                    <div class="field-actions" *ngIf="hasFieldChanged(section.key, field.key)">
                      <button mat-icon-button 
                              color="primary" 
                              (click)="saveField(section.key, field.key)"
                              matTooltip="Save this setting">
                        <mat-icon>save</mat-icon>
                      </button>
                      <button mat-icon-button 
                              color="warn" 
                              (click)="resetField(section.key, field.key, field.defaultValue)"
                              matTooltip="Reset to default">
                        <mat-icon>undo</mat-icon>
                      </button>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          </ng-template>
        </mat-tab>
      </mat-tab-group>

      <!-- Auto-save indicator -->
      <div class="auto-save-status" *ngIf="autoSaveEnabled">
        <mat-progress-bar *ngIf="isSaving" mode="indeterminate"></mat-progress-bar>
        <span class="save-indicator" [class.saving]="isSaving">
          <mat-icon>{{ isSaving ? 'sync' : 'cloud_done' }}</mat-icon>
          {{ isSaving ? 'Saving...' : 'Auto-saved' }}
        </span>
      </div>
    </div>

    <!-- Hidden file input for import -->
    <input #fileInput type="file" accept=".json" (change)="onFileSelected($event)" style="display: none;">
  `,
  styles: [`
    .admin-configuration {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 32px;
    }

    .header h1 {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin: 0;
      font-size: 2.5rem;
      font-weight: 300;
      color: #424242;
    }

    .subtitle {
      margin-top: 8px;
      color: #666;
      font-size: 1.1rem;
    }

    .actions-bar {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .config-tabs {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .tab-content {
      padding: 24px;
    }

    .section-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .section-header mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: #1976d2;
      margin-top: 4px;
    }

    .section-header h2 {
      margin: 0 0 4px 0;
      font-size: 1.5rem;
      font-weight: 400;
    }

    .section-description {
      margin: 0;
      color: #666;
      font-size: 0.95rem;
    }

    .fields-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
    }

    .field-card {
      position: relative;
      transition: box-shadow 0.2s ease;
    }

    .field-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .field-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .field-label {
      font-weight: 500;
      color: #424242;
      flex: 1;
    }

    .info-icon {
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
      color: #757575;
    }

    .field-input {
      width: 100%;
    }

    .boolean-field {
      margin: 16px 0;
    }

    .field-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      background: rgba(255,255,255,0.95);
      border-radius: 20px;
      padding: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .auto-save-status {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: white;
      padding: 12px 16px;
      border-radius: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-width: 120px;
    }

    .save-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      color: #424242;
    }

    .save-indicator.saving {
      color: #1976d2;
    }

    .save-indicator mat-icon {
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
    }

    @media (max-width: 768px) {
      .admin-configuration {
        padding: 16px;
      }

      .fields-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .actions-bar {
        flex-wrap: wrap;
        gap: 8px;
      }
    }
  `]
})
export class AdminConfigurationComponent implements OnInit, OnDestroy {
  configForm!: FormGroup;
  selectedTab = 0;
  autoSaveEnabled = true;
  isSaving = false;
  
  private destroy$ = new Subject<void>();
  private originalConfig: AppConfig;

  constructor(
    private fb: FormBuilder,
    private configService: ConfigurationService,
    private snackBar: MatSnackBar
  ) {
    this.originalConfig = this.configService.getCurrentConfig();
  }

  get configSections() {
    return this.configService.configSections;
  }

  ngOnInit(): void {
    this.buildForm();
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(event: any): void {
    this.selectedTab = event.index;
  }

  private buildForm(): void {
    const formConfig: any = {};
    
    // Build form controls for each section and field
    for (const section of this.configSections) {
      const sectionConfig: any = {};
      const fields = this.configService.getFieldsForSection(section.key);
      
      for (const field of fields) {
        const currentValue = this.getConfigValue(section.key, field.key);
        const validators = this.buildValidators(field);
        
        sectionConfig[field.key] = [currentValue, validators];
      }
      
      formConfig[section.key] = this.fb.group(sectionConfig);
    }
    
    this.configForm = this.fb.group(formConfig);
  }

  private buildValidators(field: ConfigField): any[] {
    const validators = [];
    
    if (field.validation?.required) {
      validators.push(Validators.required);
    }
    
    if (field.type === 'number' && field.validation) {
      if (field.validation.min !== undefined) {
        validators.push(Validators.min(field.validation.min));
      }
      if (field.validation.max !== undefined) {
        validators.push(Validators.max(field.validation.max));
      }
    }
    
    return validators;
  }

  private setupAutoSave(): void {
    if (this.autoSaveEnabled) {
      this.configForm.valueChanges
        .pipe(
          debounceTime(1000), // Wait 1 second after user stops typing
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.autoSave();
        });
    }
  }

  private autoSave(): void {
    if (this.configForm.valid && this.hasFormChanged()) {
      this.isSaving = true;
      
      try {
        const formValue = this.configForm.value;
        this.configService.updateConfig(formValue);
        this.originalConfig = this.configService.getCurrentConfig();
        
        setTimeout(() => {
          this.isSaving = false;
        }, 500);
        
      } catch (error) {
        this.isSaving = false;
        this.snackBar.open('Error saving configuration', 'Close', { duration: 3000 });
      }
    }
  }

  getFieldsForSection(sectionKey: string) {
    return this.configService.getFieldsForSection(sectionKey as keyof AppConfig);
  }

  getFieldControlName(sectionKey: string, fieldKey: string): string {
    return `${sectionKey}.${fieldKey}`;
  }

  getFieldControl(sectionKey: string, fieldKey: string) {
    return this.configForm.get(`${sectionKey}.${fieldKey}`);
  }

  private getConfigValue(sectionKey: string, fieldKey: string): any {
    const config = this.configService.getCurrentConfig();
    return (config as any)[sectionKey]?.[fieldKey];
  }

  hasFieldChanged(sectionKey: string, fieldKey: string): boolean {
    const currentValue = this.getFieldControl(sectionKey, fieldKey)?.value;
    const originalValue = (this.originalConfig as any)[sectionKey]?.[fieldKey];
    return currentValue !== originalValue;
  }

  private hasFormChanged(): boolean {
    const formValue = this.configForm.value;
    return JSON.stringify(formValue) !== JSON.stringify(this.originalConfig);
  }

  saveField(sectionKey: string, fieldKey: string): void {
    const control = this.getFieldControl(sectionKey, fieldKey);
    if (control && control.valid) {
      const updates = {
        [sectionKey]: {
          [fieldKey]: control.value
        }
      };
      
      try {
        this.configService.updateConfig(updates);
        this.originalConfig = this.configService.getCurrentConfig();
        this.snackBar.open('Setting saved', 'Close', { duration: 2000 });
      } catch (error) {
        this.snackBar.open('Error saving setting', 'Close', { duration: 3000 });
      }
    }
  }

  resetField(sectionKey: string, fieldKey: string, defaultValue: any): void {
    const control = this.getFieldControl(sectionKey, fieldKey);
    if (control) {
      control.setValue(defaultValue);
      this.saveField(sectionKey, fieldKey);
    }
  }

  resetSectionToDefaults(sectionKey: string): void {
    const fields = this.getFieldsForSection(sectionKey);
    const sectionGroup = this.configForm.get(sectionKey) as FormGroup;
    
    if (sectionGroup) {
      for (const field of fields) {
        sectionGroup.get(field.key)?.setValue(field.defaultValue);
      }
      
      this.configService.resetSectionToDefaults(sectionKey as keyof AppConfig);
      this.originalConfig = this.configService.getCurrentConfig();
      this.snackBar.open(`${sectionKey} section reset to defaults`, 'Close', { duration: 3000 });
    }
  }

  resetAllToDefaults(): void {
    this.configService.resetToDefaults();
    this.originalConfig = this.configService.getCurrentConfig();
    this.buildForm(); // Rebuild form with default values
    this.snackBar.open('All settings reset to defaults', 'Close', { duration: 3000 });
  }

  exportConfiguration(): void {
    const config = this.configService.getCurrentConfig();
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `mean15-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    this.snackBar.open('Configuration exported', 'Close', { duration: 2000 });
  }

  importConfiguration(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const importedConfig = JSON.parse(e.target.result);
          this.configService.updateConfig(importedConfig);
          this.originalConfig = this.configService.getCurrentConfig();
          this.buildForm(); // Rebuild form with imported values
          this.snackBar.open('Configuration imported successfully', 'Close', { duration: 3000 });
        } catch (error) {
          this.snackBar.open('Error importing configuration', 'Close', { duration: 3000 });
        }
      };
      reader.readAsText(file);
    }
  }
}