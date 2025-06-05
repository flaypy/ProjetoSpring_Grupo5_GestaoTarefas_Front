import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { TitleCasePipe } from '@angular/common';
import { Tarefa, StatusTarefa } from '../../models';
import { PRIORITIES, PriorityOption } from '../../models';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

export interface TaskFormData {
  task?: Tarefa;
  isEditMode: boolean;
  listId?: number | null; // Optional: for creating a task directly into a list
}

@Component({
  selector: 'app-task-form-dialog',
  templateUrl: './task-form-dialog.component.html',
  standalone: true, // Already standalone
  imports: [
    TitleCasePipe, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatSnackBarModule
  ],
})
export class TaskFormDialogComponent implements OnInit {
  taskForm: FormGroup;
  statusOptions = Object.values(StatusTarefa);
  priorityOptions: PriorityOption[] = PRIORITIES;
  isEditMode: boolean;
  dialogTitle: string;
  private currentListId: number | null = null;

  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  constructor(
    public dialogRef: MatDialogRef<TaskFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskFormData
  ) {
    this.isEditMode = data.isEditMode;
    this.currentListId = data.listId || null;
    this.dialogTitle = this.isEditMode ? 'Edit Task' : (this.currentListId ? 'Create New Task in List' : 'Create Global Task');

    this.taskForm = this.fb.group({
      description: [this.data.task?.description || '', [Validators.required, Validators.minLength(3)]],
      priority: [this.data.task?.priority ?? 1, Validators.required],
      status: [this.data.task?.status || StatusTarefa.PENDENTE, Validators.required],
      responsible: [this.data.task?.responsible || '', Validators.required]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      const taskData: Tarefa = {
        id: this.isEditMode && this.data.task ? this.data.task.id : undefined,
        description: formValue.description,
        priority: Number(formValue.priority),
        status: formValue.status,
        responsible: formValue.responsible,
        taskListId: this.isEditMode ? (this.data.task?.taskListId ?? undefined) : (this.currentListId || undefined)
      };

      this.dialogRef.close(taskData);
    } else {
      this.taskForm.markAllAsTouched();
      this.snackBar.open('Please fill all required fields correctly.', 'Close', { duration: 3000 });
    }
  }

  onCancel(): void { this.dialogRef.close(); }
  getErrorMessage(controlName: string): string {
    const control = this.taskForm.get(controlName);
    if (!control) return '';
    if (control.hasError('required')) return 'This field is required.';
    if (control.hasError('minlength')) return `Min length is ${control.errors?.['minlength'].requiredLength}.`;
    return '';
  }
}
