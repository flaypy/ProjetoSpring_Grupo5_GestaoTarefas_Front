import { Component, OnInit, AfterViewInit, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TarefaService } from '../../services/tarefa.service'; // Already imported via inject
import { Tarefa, StatusTarefa } from '../../models'; // Already imported
import { PRIORITIES as P_OPTIONS, PriorityOption, getPriorityByValue as getPByValue } from '../../models/priority.model'; // Renamed to avoid conflict
import { TaskFormDialogComponent, TaskFormData } from '../task-form-dialog/task-form-dialog.component'; // Already imported
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component'; // Already imported
import { catchError, finalize, of, startWith, switchMap, tap, debounceTime } from 'rxjs';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  standalone: true,
  imports: [
    MatTooltip, CommonModule, TitleCasePipe, ReactiveFormsModule, FormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule, MatSelectModule,
    MatCardModule, MatProgressSpinnerModule
  ]
})
export class TaskListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['id', 'description', 'status', 'priority', 'responsible', 'actions'];
  dataSource: MatTableDataSource<Tarefa> = new MatTableDataSource<Tarefa>();
  isLoading = true;
  filterForm: FormGroup;

  public readonly StatusTarefa = StatusTarefa;
  public readonly priorityOptionsList: PriorityOption[] = P_OPTIONS; // Use renamed import
  public getPriorityView = getPByValue; // Use renamed import

  statusOptions = Object.values(StatusTarefa);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private tarefaService = inject(TarefaService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.filterForm = this.fb.group({
      status: [''],
      priority: [null],
      responsible: ['']
    });
  }

  ngOnInit(): void {
    this.filterForm.valueChanges.pipe(
      startWith(this.filterForm.value),
      debounceTime(300),
      tap(() => this.isLoading = true),
      switchMap(filtersFromForm => {
        const activeFilters: { status?: string, priority?: number, responsible?: string } = {};
        if (filtersFromForm.status) activeFilters.status = filtersFromForm.status;
        activeFilters.priority = (filtersFromForm.priority !== null && filtersFromForm.priority !== '') ? Number(filtersFromForm.priority) : undefined;
        if (filtersFromForm.responsible && filtersFromForm.responsible.trim() !== '') activeFilters.responsible = filtersFromForm.responsible.trim();

        console.log('Fetching tasks with filters:', activeFilters); // For debugging
        return this.tarefaService.getTarefas(activeFilters).pipe(
          catchError(err => {
            this.showError(`Failed to load tasks. ${err.message}`);
            this.dataSource.data = []; // Clear data on error
            return of([]);
          }),
          finalize(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          })
        );
      })
    ).subscribe(tasks => {
      this.dataSource.data = tasks;
      if (this.dataSource.paginator && tasks.length > 0) { // Check tasks.length to avoid error if paginator not ready for empty data
        this.dataSource.paginator.firstPage();
      }
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => { /* ... same as before ... */
      switch (property) {
        case 'priority': return item.priority;
        case 'description': return item.description;
        default: return (item as any)[property];
      }
    };
  }

  refreshTasks(): void { this.filterForm.setValue(this.filterForm.value, { emitEvent: true }); }
  applyTableFilter(event: Event): void { /* ... same as before ... */
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }
  clearFilters(): void { /* ... same as before ... */
    this.filterForm.reset({ status: '', priority: null, responsible: '' }, { emitEvent: true });
    this.dataSource.filter = '';
  }
  openCreateTaskDialog(): void { /* ... same as before, check error handling ... */
    const dialogRef = this.dialog.open<TaskFormDialogComponent, TaskFormData, Tarefa>(TaskFormDialogComponent, { width: '600px', data: { isEditMode: false }, disableClose: true, panelClass: 'rounded-lg'});
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.tarefaService.createTarefa(result).pipe(finalize(() => {this.isLoading = false; this.cdr.detectChanges();}))
          .subscribe({ next: () => { this.showSuccess('Task created!'); this.refreshTasks(); }, error: (err) => this.showError(`Create failed. ${err.message}`) });
      }
    });
  }
  openEditTaskDialog(task: Tarefa): void { /* ... same as before, check error handling ... */
    const dialogRef = this.dialog.open<TaskFormDialogComponent, TaskFormData, Tarefa>(TaskFormDialogComponent, { width: '600px', data: { task: { ...task }, isEditMode: true }, disableClose: true, panelClass: 'rounded-lg'});
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.id) {
        this.isLoading = true;
        this.tarefaService.updateTarefa(result.id, result).pipe(finalize(() => {this.isLoading = false; this.cdr.detectChanges();}))
          .subscribe({ next: () => { this.showSuccess('Task updated!'); this.refreshTasks(); }, error: (err) => this.showError(`Update failed. ${err.message}`) });
      }
    });
  }
  deleteTask(taskId: number | undefined): void { /* ... same as before, check error handling ... */
    if (taskId === undefined) { this.showError('Task ID missing.'); return; }
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {width: '400px', data: { title: 'Confirm Deletion', message: 'Delete this task?'}});
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.isLoading = true;
        this.tarefaService.deleteTarefa(taskId).pipe(finalize(() => {this.isLoading = false; this.cdr.detectChanges();}))
          .subscribe({ next: () => { this.showSuccess('Task deleted!'); this.refreshTasks(); }, error: (err) => this.showError(`Delete failed. ${err.message}`) });
      }
    });
  }
  quickChangeStatus(task: Tarefa, newStatus: StatusTarefa | string): void { /* ... same as before, check error handling ... */
    if (!task.id) return;
    if (task.status === newStatus) { this.snackBar.open(`Task already ${newStatus}.`, 'Close', {duration:2000}); return; }
    this.isLoading = true;
    this.tarefaService.updateTaskStatus(task.id, newStatus as string).pipe(finalize(() => { this.isLoading = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (updatedTask) => {
          this.showSuccess(`Status updated!`);
          const index = this.dataSource.data.findIndex(t => t.id === updatedTask.id);
          if (index > -1) {
            const updatedData = [...this.dataSource.data]; updatedData[index] = updatedTask; this.dataSource.data = updatedData;
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
  private showSuccess(message: string): void { this.snackBar.open(message, 'OK', { duration: 3000, panelClass: ['bg-green-500', 'text-white'] }); }
  private showError(message: string): void { this.snackBar.open(message, 'ERROR', { duration: 5000, panelClass: ['bg-red-500', 'text-white'] }); }
}
