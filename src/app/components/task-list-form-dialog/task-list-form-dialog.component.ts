import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskList } from '../../models'; // Using models/index.ts

export interface TaskListFormData {
  isEditMode: boolean;
  taskList?: TaskList; // For editing
}

@Component({
  selector: 'app-task-list-form-dialog',
  templateUrl: './task-list-form-dialog.component.html',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ]
})
export class TaskListFormDialogComponent implements OnInit {
  taskListForm: FormGroup;
  isEditMode: boolean;
  dialogTitle: string;

  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  constructor(
    public dialogRef: MatDialogRef<TaskListFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskListFormData
  ) {
    this.isEditMode = data.isEditMode;
    this.dialogTitle = this.isEditMode ? 'Edit Task List Name' : 'Create New Task List';
    this.taskListForm = this.fb.group({
      name: [this.data.taskList?.name || '', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.taskListForm.valid) {
      this.dialogRef.close(this.taskListForm.value); // Returns { name: '...' }
    } else {
      this.taskListForm.markAllAsTouched();
      this.snackBar.open('Please provide a valid name (min 3 characters).', 'Close', { duration: 3000 });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(controlName: string): string {
    const control = this.taskListForm.get(controlName);
    if (!control) return '';
    if (control.hasError('required')) { return 'Name is required.'; }
    if (control.hasError('minlength')) { return `Name must be at least ${control.errors?.['minlength'].requiredLength} characters.`; }
    return '';
  }
}
