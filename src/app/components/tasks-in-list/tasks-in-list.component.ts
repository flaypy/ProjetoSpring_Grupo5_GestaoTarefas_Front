import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule }
  from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

import {TaskList, Tarefa, StatusTarefa, getPriorityByValue as getPByValue} from '../../models';
import { TaskListService } from '../../services/task-list.service'; // For loading tasks in a list
import { TarefaService } from '../../services/tarefa.service'; // For editing/status of tasks
import { TaskFormDialogComponent, TaskFormData } from '../task-form-dialog/task-form-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { PRIORITIES, PriorityOption, getPriorityByValue } from '../../models';
import { Subscription, switchMap, tap, finalize, catchError, of, debounceTime, Observable } from 'rxjs';

@Component({
  selector: 'app-tasks-in-list',
  templateUrl: './tasks-in-list.component.html',
  styleUrls: ['./tasks-in-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTableModule, MatPaginatorModule, MatSortModule, MatFormFieldModule,
    MatInputModule, MatSelectModule
  ]
})
export class TasksInListComponent implements OnInit, OnDestroy {
  listId!: number;
  taskList: TaskList | null = null;

  displayedColumns: string[] = ['id', 'description', 'status', 'priority', 'responsible', 'actions'];
  dataSource: MatTableDataSource<Tarefa> = new MatTableDataSource<Tarefa>();
  isLoading = true;
  isLoadingListDetails = true;

  filterForm: FormGroup;
  statusOptions = Object.values(StatusTarefa);
  priorityOptions: PriorityOption[] = PRIORITIES;

  public readonly StatusTarefa = StatusTarefa;
  public getPriorityView = getPriorityByValue;

  private routeSubscription: Subscription | undefined;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private taskListService = inject(TaskListService);
  private tarefaService = inject(TarefaService); // For general task operations like update status
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);

  constructor() {
    this.filterForm = this.fb.group({
      status: [''],
      priority: [null],
      responsible: ['']
    });
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.pipe(
      tap(() => {
        this.isLoading = true;
        this.isLoadingListDetails = true;
      }),
      switchMap(params => {
        const id = params.get('listId');
        if (id) {
          this.listId = +id;
          // Fetch list details (name) - could be a separate call or combined if backend supports
          // For now, we'll just load tasks. If TaskList name is needed, fetch it.
          // This example assumes we might want the list name shown.
          // Let's simplify: just load tasks. List name isn't in TaskListManagementComponent's TaskList items.
          // We can fetch the list details IF needed. For now, just focus on tasks.
          // If you also fetch list details: this.loadListDetails(this.listId);
          return this.loadTasksForList(this.listId, this.filterForm.value);
        } else {
          this.showError('Task List ID not found in route.');
          this.isLoading = false;
          this.isLoadingListDetails = false;
          return of([]); // Return empty observable or handle error appropriately
        }
      })
    ).subscribe(); // Subscription managed by component lifecycle for route params

    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      tap(() => this.isLoading = true),
      switchMap(filters => this.loadTasksForList(this.listId, filters))
    ).subscribe();
  }

  loadTasksForList(listId: number, filters?: any): Observable<Tarefa[]> {
    this.isLoading = true;
    let request$: Observable<Tarefa[]>;

    if (filters?.status) {
      request$ = this.taskListService.getTasksFilteredByStatus(listId, filters.status);
    } else if (filters?.priority !== null && filters?.priority !== undefined) {
      request$ = this.taskListService.getTasksFilteredByPriority(listId, Number(filters.priority));
    } else if (filters?.responsible) {
      request$ = this.taskListService.getTasksFilteredByResponsible(listId, filters.responsible);
    } else {
      request$ = this.taskListService.getAllTasksInList(listId); // Or getTasksByListId
    }

    return request$.pipe(
      tap(tasks => {
        this.dataSource.data = tasks;
        this.cdr.detectChanges();
      }),
      catchError(err => {
        this.showError(`Failed to load tasks for list ${listId}. ${err.message}`);
        this.dataSource.data = [];
        return of([]);
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
        if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
      })
    );
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => { /* ... similar to TaskListComponent ... */
      switch (property) {
        case 'priority': return item.priority;
        case 'description': return item.description;
        default: return (item as any)[property];
      }
    };
  }

  applyTableFilter(event: Event) { /* ... same as TaskListComponent ... */ }
  clearFilters() { this.filterForm.reset({ status: '', priority: null, responsible: '' }); }

  openCreateTaskInListDialog(): void {
    const dialogRef = this.dialog.open<TaskFormDialogComponent, TaskFormData, Tarefa>(
      TaskFormDialogComponent, {
        width: '600px',
        data: { isEditMode: false, listId: this.listId }, // Pass listId
        disableClose: true, panelClass: 'rounded-lg'
      }
    );
    dialogRef.afterClosed().subscribe(newTaskData => {
      if (newTaskData) { // newTaskData already includes taskListId from the dialog
        this.isLoading = true;
        this.tarefaService.createTarefa(newTaskData).pipe(
          finalize(() => this.isLoading = false)
        ).subscribe({
          next: () => {
            this.showSuccess('Task created in list successfully!');
            this.loadTasksForList(this.listId, this.filterForm.value).subscribe();
          },
          error: (err) => this.showError(`Failed to create task. ${err.message}`)
        });
      }
    });
  }

  openEditTaskDialog(task: Tarefa): void {
    const dialogRef = this.dialog.open<TaskFormDialogComponent, TaskFormData, Tarefa>(
      TaskFormDialogComponent, {
        width: '600px',
        data: { task: { ...task }, isEditMode: true, listId: this.listId }, // Pass listId for context
        disableClose: true, panelClass: 'rounded-lg'
      }
    );
    dialogRef.afterClosed().subscribe(updatedTaskData => {
      if (updatedTaskData && updatedTaskData.id) {
        this.isLoading = true;
        this.tarefaService.updateTarefa(updatedTaskData.id, updatedTaskData).pipe(
          finalize(() => this.isLoading = false)
        ).subscribe({
          next: () => {
            this.showSuccess('Task updated successfully!');
            this.loadTasksForList(this.listId, this.filterForm.value).subscribe();
          },
          error: (err) => this.showError(`Failed to update task. ${err.message}`)
        });
      }
    });
  }

  removeTaskFromThisList(task: Tarefa): void {
    if (!task.id) { this.showError('Task ID is missing.'); return; }
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent, {
        width: '400px',
        data: { title: 'Confirm Removal', message: `Remove task "${task.description}" from this list?`, confirmText: 'Remove' }
      }
    );
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.isLoading = true;
        this.taskListService.removeTaskFromList(this.listId, task.id!).pipe(
          finalize(() => this.isLoading = false)
        ).subscribe({
          next: () => {
            this.showSuccess('Task removed from list successfully!');
            this.loadTasksForList(this.listId, this.filterForm.value).subscribe();
          },
          error: (err) => this.showError(`Failed to remove task. ${err.message}`)
        });
      }
    });
  }

  quickChangeStatus(task: Tarefa, newStatus: StatusTarefa | string): void {
    if (!task.id) return;
    if (task.status === newStatus) { /* ... */ return; }
    this.isLoading = true;
    this.tarefaService.updateTaskStatus(task.id, newStatus as string).pipe(
      finalize(() => { this.isLoading = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: (updatedTask) => {
        this.showSuccess(`Task status updated!`);
        // Efficiently update local data source without full reload
        const index = this.dataSource.data.findIndex(t => t.id === updatedTask.id);
        if (index > -1) {
          const updatedData = [...this.dataSource.data];
          updatedData[index] = updatedTask;
          this.dataSource.data = updatedData;
        }
        this.cdr.detectChanges();
      },
      error: (err) => this.showError(`Status update failed. ${err.message}`)
    });
  }


  getStatusColor(status: StatusTarefa | string): string { /* ... same as before ... */
    switch (status) {
      case StatusTarefa.PENDENTE: return 'bg-yellow-200 text-yellow-800';
      case StatusTarefa.EM_ANDAMENTO: return 'bg-blue-200 text-blue-800';
      case StatusTarefa.CONCLUIDA: return 'bg-green-200 text-green-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  }
  getPriorityStyling(priorityValue: number): { icon: string, colorClass: string } { /* ... same as before ... */
    const priority = getPByValue(priorityValue);
    return { icon: priority?.icon || 'help_outline', colorClass: priority?.colorClass || 'text-gray-600' };
  }

  navigateBackToLists(): void {
    this.router.navigate(['/task-lists']);
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  private showSuccess(message: string): void { this.snackBar.open(message, 'OK', { duration: 3000 }); }
  private showError(message: string): void { this.snackBar.open(message, 'ERROR', { duration: 5000 }); }
}
