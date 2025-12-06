import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormsModule } from '@angular/forms';
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
import { UserService} from '../../services/userService';
import { User } from '../../models/users';

@Component({
  selector: 'app-admin-configuration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
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
  templateUrl: './admin-configuration.component.html',
  styleUrls: ['./admin-configuration.component.scss']
})
export class AdminConfigurationComponent implements OnInit, OnDestroy {
  defaultName: string = '';
  users: User[] = [];
  selectedUser: User | null = null;
  leagueOptions = [
    { value: 'Premier', label: 'Friday' },
    { value: 'Championship', label: 'Swindle' },
    { value: 'League One', label: 'Rochester' }
  ];
  isUpdatingLeague = false;
  configForm!: FormGroup;
  selectedTab = 0;
  autoSaveEnabled = true;
  isSaving = false;
  
  private destroy$ = new Subject<void>();
  private originalConfig: AppConfig;

  constructor(
    private fb: FormBuilder,
    private configService: ConfigurationService,
    private snackBar: MatSnackBar,
    private userService: UserService
  ) {
    this.originalConfig = this.configService.getCurrentConfig();
  }

  get configSections() {
    return this.configService.configSections;
  }

  ngOnInit(): void {
    this.buildForm();
    this.setupAutoSave();
    this.loadUsers();
    this.loadDefaultName();
  }

  loadDefaultName(): void {
    const stored = localStorage.getItem('defaultMatchName');
    this.defaultName = stored || '';
  }

  saveDefaultName(name: string): void {
    this.defaultName = name;
    localStorage.setItem('defaultMatchName', name);
  }

  loadUsers(): void {
    this.userService.getAll().subscribe({
      next: (res) => {
        this.users = res.users || [];
      },
      error: () => {
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
      }
    });
  }

  selectUser(user: User): void {
    this.selectedUser = user;
  }

  updateLeague(league: string): void {
    if (!this.selectedUser?._id) return;
    this.isUpdatingLeague = true;
    this.userService.updateLeague(this.selectedUser._id, league).subscribe({
      next: (res) => {
        this.selectedUser = res.user;
        this.isUpdatingLeague = false;
        this.snackBar.open('League updated', 'Close', { duration: 2000 });
      },
      error: () => {
        this.isUpdatingLeague = false;
        this.snackBar.open('Failed to update league', 'Close', { duration: 3000 });
      }
    });
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