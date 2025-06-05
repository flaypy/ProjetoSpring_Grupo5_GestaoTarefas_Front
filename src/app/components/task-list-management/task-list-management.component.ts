import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router'; // Added Router
// ... other imports from previous version ...
import { TaskList } from '../../models';
import { TaskListService } from '../../services/task-list.service';
import { TaskListFormDialogComponent, TaskListFormData } from '../task-list-form-dialog/task-list-form-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { finalize } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-task-list-management',
  templateUrl: './task-list-management.component.html',
  styleUrls: ['./task-list-management.component.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatCardModule, MatListModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ]
})
export class TaskListManagementComponent implements OnInit {
  taskLists: TaskList[] = [];
  isLoading = true;

  private taskListService = inject(TaskListService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router); // Inject Router

  constructor() {}

  ngOnInit(): void { this.loadTaskLists(); }
  loadTaskLists(): void { /* ... same as before ... */
    this.isLoading = true;
    this.taskListService.getTaskLists().pipe(finalize(() => { this.isLoading = false; this.cdr.detectChanges(); }))
      .subscribe({ next: (lists) => { this.taskLists = lists; }, error: (err) => this.showError(`Failed to load task lists. ${err.message}`) });
  }
  openCreateTaskListDialog(): void { /* ... same as before ... */
    const dialogRef = this.dialog.open<TaskListFormDialogComponent, TaskListFormData, { name: string }>(TaskListFormDialogComponent, { width: '450px', data: { isEditMode: false }, disableClose: true, panelClass: 'rounded-lg'});
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.name) {
        this.isLoading = true;
        this.taskListService.createTaskList(result.name).pipe(finalize(() => this.isLoading = false))
          .subscribe({ next: () => { this.showSuccess('Task list created!'); this.loadTaskLists(); }, error: (err) => this.showError(`Create failed. ${err.message}`) });
      }
    });
  }
  openEditTaskListNameDialog(taskList: TaskList): void { /* ... same as before ... */
    const dialogRef = this.dialog.open<TaskListFormDialogComponent, TaskListFormData, { name: string }>(TaskListFormDialogComponent, { width: '450px', data: { isEditMode: true, taskList: { ...taskList } }, disableClose: true, panelClass: 'rounded-lg'});
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.name && taskList.id) {
        this.isLoading = true;
        this.taskListService.updateTaskListName(taskList.id, result.name).pipe(finalize(() => this.isLoading = false))
          .subscribe({ next: (updatedList) => { this.showSuccess(`List '${updatedList.name}' renamed!`); this.loadTaskLists(); }, error: (err) => this.showError(`Rename failed. ${err.message}`) });
      }
    });
  }
  deleteTaskList(taskList: TaskList): void { /* ... same as before ... */
    if (!taskList || taskList.id === undefined) { this.showError('Task list ID missing.'); return; }
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, { width: '400px', data: { title: 'Confirm Deletion', message: `Delete list "${taskList.name}" and its tasks?`, confirmText: 'Delete List'}});
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.isLoading = true;
        this.taskListService.deleteTaskList(taskList.id).pipe(finalize(() => this.isLoading = false))
          .subscribe({ next: () => { this.showSuccess(`List "${taskList.name}" deleted!`); this.loadTaskLists(); }, error: (err) => this.showError(`Delete failed. ${err.message}`) });
      }
    });
  }

  viewTasksInList(listId: number): void {
    this.router.navigate(['/task-lists', listId, 'tasks']); // Navigate to the new route
  }

  private showSuccess(message: string): void { /* ... */ }
  private showError(message: string): void { /* ... */ }
}
