import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectionList, MatListModule, MatListOption } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TarefaService } from '../../services/tarefa.service';
import { Tarefa } from '../../models';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-add-existing-task-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './add-existing-task-dialog.component.html',
})
export class AddExistingTaskDialogComponent implements OnInit {
  availableTasks: Tarefa[] = [];
  isLoading = true;

  @ViewChild('taskListSelection') taskListSelection?: MatSelectionList;

  private tarefaService = inject(TarefaService);
  public dialogRef = inject(MatDialogRef<AddExistingTaskDialogComponent>);

  ngOnInit(): void {
    // Fetches only global tasks (those without a taskListId)
    this.tarefaService.getTarefas()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (tasks) => {
          this.availableTasks = tasks;
        },
        error: (err) => {
          console.error('Failed to load available tasks', err);
          // Optionally show a snackbar message here
          this.dialogRef.close(); // Close if tasks can't be loaded
        }
      });
  }

  onConfirm(): void {
    if (!this.taskListSelection) {
      return;
    }
    const selectedTaskIds = this.taskListSelection.selectedOptions.selected.map(
      (option: MatListOption) => option.value
    );
    this.dialogRef.close(selectedTaskIds);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
