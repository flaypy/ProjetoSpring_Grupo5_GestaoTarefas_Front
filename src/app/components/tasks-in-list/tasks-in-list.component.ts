import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, Subscription, switchMap, tap, finalize, catchError, of, debounceTime, Observable } from 'rxjs';

// Angular Material Modules
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

// App Specific Imports
import { AddExistingTaskDialogComponent } from '../add-existing-task-dialog/add-existing-task-dialog.component';
import { TaskList, Tarefa, StatusTarefa, PRIORITIES, PriorityOption, getPriorityByValue } from '../../models';
import { TaskListService } from '../../services/task-list.service';
import { TarefaService } from '../../services/tarefa.service';
import { TaskFormDialogComponent, TaskFormData } from '../task-form-dialog/task-form-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-tasks-in-list',
  templateUrl: './tasks-in-list.component.html',
  styleUrls: ['./tasks-in-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, FormsModule, TitleCasePipe,
    MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTableModule, MatPaginatorModule, MatSortModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTooltipModule
  ]
})
export class TasksInListComponent implements OnInit, AfterViewInit, OnDestroy {
  listId!: number;
  taskList: TaskList | null = null;

  displayedColumns: string[] = ['id', 'description', 'status', 'priority', 'responsible', 'actions'];
  dataSource: MatTableDataSource<Tarefa> = new MatTableDataSource<Tarefa>();
  isLoading = true;

  filterForm: FormGroup;
  statusOptions = Object.values(StatusTarefa);
  priorityOptions: PriorityOption[] = PRIORITIES;

  public readonly StatusTarefa = StatusTarefa;
  public getPriorityView = getPriorityByValue;

  private subscriptions = new Subscription();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private taskListService = inject(TaskListService);
  private tarefaService = inject(TarefaService);
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
    const routeSub = this.route.paramMap.pipe(
      tap(() => this.isLoading = true),
      switchMap(params => {
        const id = params.get('listId');
        if (id) {
          this.listId = +id;
          return this.loadTasksForList(this.listId, this.filterForm.value);
        } else {
          this.showError('Task List ID not found in route.');
          this.isLoading = false;
          return of([]);
        }
      })
    ).subscribe();
    this.subscriptions.add(routeSub);

    const filterSub = this.filterForm.valueChanges.pipe(
      debounceTime(300),
      tap(() => this.isLoading = true),
      switchMap(filters => this.loadTasksForList(this.listId, filters))
    ).subscribe();
    this.subscriptions.add(filterSub);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'priority': return item.priority;
        case 'description': return item.description.toLocaleLowerCase();
        default: return (item as any)[property];
      }
    };
  }

  loadTasksForList(listId: number, filters?: any): Observable<Tarefa[]> {
    this.isLoading = true;
    return this.taskListService.getAllTasksInList(listId).pipe(
      tap(tasks => {
        let filteredTasks = tasks;
        if (filters) {
          filteredTasks = tasks.filter(task => {
            const statusMatch = !filters.status || task.status === filters.status;
            const priorityMatch = filters.priority === null || filters.priority === undefined || task.priority === filters.priority;
            const responsibleMatch = !filters.responsible || task.responsible.toLowerCase().includes(filters.responsible.toLowerCase());
            return statusMatch && priorityMatch && responsibleMatch;
          });
        }
        this.dataSource.data = filteredTasks;
        this.cdr.detectChanges();
      }),
      catchError(err => {
        this.showError(`Failed to load tasks for list ${listId}. ${err.message}`);
        this.dataSource.data = [];
        return of([]);
      }),
      finalize(() => {
        this.isLoading = false;
        if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
        }
      })
    );
  }

  applyTableFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearFilters() {
    this.filterForm.reset({ status: '', priority: null, responsible: '' });
  }

  openAddExistingTaskDialog(): void {
    const dialogRef = this.dialog.open<AddExistingTaskDialogComponent, never, number[]>(
      AddExistingTaskDialogComponent, {
        width: '500px',
        disableClose: true,
      }
    );

    const dialogSub = dialogRef.afterClosed().subscribe(selectedTaskIds => {
      if (selectedTaskIds && selectedTaskIds.length > 0) {
        this.isLoading = true;
        const addRequests = selectedTaskIds.map(taskId =>
          this.taskListService.addTaskToList(this.listId, taskId)
        );

        forkJoin(addRequests).pipe(
          finalize(() => this.isLoading = false)
        ).subscribe({
          next: () => {
            this.showSuccess(`${selectedTaskIds.length} task(s) added to the list successfully!`);
            this.loadTasksForList(this.listId, this.filterForm.value).subscribe();
          },
          error: (err) => {
            this.showError(`Failed to add one or more tasks. ${err.message}`);
          }
        });
      }
    });
    this.subscriptions.add(dialogSub);
  }

  openCreateTaskInListDialog(): void {
    const dialogRef = this.dialog.open<TaskFormDialogComponent, TaskFormData, Tarefa>(
      TaskFormDialogComponent, {
        width: '600px',
        data: { isEditMode: false, listId: this.listId },
        disableClose: true,
      }
    );
    const dialogSub = dialogRef.afterClosed().subscribe(newTaskData => {
      if (newTaskData) {
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
    this.subscriptions.add(dialogSub);
  }

  openEditTaskDialog(task: Tarefa): void {
    const dialogRef = this.dialog.open<TaskFormDialogComponent, TaskFormData, Tarefa>(
      TaskFormDialogComponent, {
        width: '600px',
        data: { task: { ...task }, isEditMode: true, listId: this.listId },
        disableClose: true,
      }
    );
    const dialogSub = dialogRef.afterClosed().subscribe(updatedTaskData => {
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
    this.subscriptions.add(dialogSub);
  }

  removeTaskFromThisList(task: Tarefa): void {
    if (!task.id) { this.showError('Task ID is missing.'); return; }
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent, {
        width: '400px',
        data: { title: 'Confirm Removal', message: `Remove task "${task.description}" from this list?`, confirmText: 'Remove' }
      }
    );
    const dialogSub = dialogRef.afterClosed().subscribe(confirmed => {
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
    this.subscriptions.add(dialogSub);
  }

  quickChangeStatus(task: Tarefa, newStatus: StatusTarefa | string): void {
    if (!task.id || task.status === newStatus) return;
    this.isLoading = true;
    this.tarefaService.updateTaskStatus(task.id, newStatus as string).pipe(
      finalize(() => { this.isLoading = false; })
    ).subscribe({
      next: (updatedTask) => {
        this.showSuccess(`Task status updated!`);
        const index = this.dataSource.data.findIndex(t => t.id === updatedTask.id);
        if (index > -1) {
          const data = this.dataSource.data;
          data[index] = updatedTask;
          this.dataSource.data = data; // Trigger table update
        }
      },
      error: (err) => this.showError(`Status update failed. ${err.message}`)
    });
  }

  getStatusColor(status: StatusTarefa | string): string {
    switch (status) {
      case StatusTarefa.PENDENTE: return 'bg-yellow-200 text-yellow-800';
      case StatusTarefa.EM_ANDAMENTO: return 'bg-blue-200 text-blue-800';
      case StatusTarefa.CONCLUIDA: return 'bg-green-200 text-green-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  }

  getPriorityStyling(priorityValue: number): { icon: string, colorClass: string } {
    const priority = getPriorityByValue(priorityValue);
    return { icon: priority?.icon || 'help_outline', colorClass: priority?.colorClass || 'text-gray-600' };
  }

  navigateBackToLists(): void {
    this.router.navigate(['/task-lists']);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private showSuccess(message: string): void { this.snackBar.open(message, 'OK', { duration: 3000 }); }
  private showError(message: string): void { this.snackBar.open(message, 'ERROR', { duration: 5000 }); }
}
