import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { TitleCasePipe } from '@angular/common';
import { Tarefa, StatusTarefa } from '../../models/tarefa.model';
import { PRIORITIES, PriorityOption } from '../../models/priority.model';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

export interface TaskFormData {
  task?: Tarefa;
  isEditMode: boolean;
}

@Component({
  selector: 'app-task-form-dialog',
  templateUrl: './task-form-dialog.component.html',
  styleUrls: ['./task-form-dialog.component.scss'],
  standalone: true,
  imports: [
    TitleCasePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule
  ],
})
export class TaskFormDialogComponent implements OnInit {
  taskForm: FormGroup;
  statusOptions = Object.values(StatusTarefa);
  priorityOptions: PriorityOption[] = PRIORITIES;
  isEditMode: boolean;

  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  constructor(
    public dialogRef: MatDialogRef<TaskFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskFormData
  ) {
    this.isEditMode = data.isEditMode;
    this.taskForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3)]],
      priority: [1, Validators.required],
      status: [StatusTarefa.PENDENTE, Validators.required],
      responsible: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.task) {
      this.taskForm.patchValue(this.data.task);
    }
  }

  onSubmit(): void {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      const taskData: Tarefa = {
        id: this.isEditMode && this.data.task ? this.data.task.id : undefined,
        ...formValue
      };
      this.dialogRef.close(taskData);
    } else {
      this.taskForm.markAllAsTouched();
      this.snackBar.open('Please fill all required fields correctly.', 'Close', { duration: 3000 });
    }
  }

  onCancel(): void { this.dialogRef.close(); }
  getErrorMessage(controlName: string): string { /* ... same as before ... */
    const control = this.taskForm.get(controlName);
    if (!control) return '';
    if (control.hasError('required')) return 'This field is required.';
    if (control.hasError('minlength')) return `Minimum length is ${control.errors?.['minlength'].requiredLength}.`;
    return '';
  }
}
