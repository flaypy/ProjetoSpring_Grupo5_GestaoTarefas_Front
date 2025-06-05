import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TaskList, Tarefa } from '../models' // Assuming a shared models index or direct import
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class TaskListService {
  private apiUrl = `${environment.apiUrl}/gestao-tarefas/lists`; // Base path for TaskListController
  private http = inject(HttpClient);

  constructor() { }

  private handleError(error: HttpErrorResponse) {
    // Same error handler as TarefaService or a shared one
    console.error('API Error (TaskListService):', error);
    return throwError(() => new Error('An error occurred in TaskListService.'));
  }

  getTaskLists(): Observable<TaskList[]> {
    return this.http.get<TaskList[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  createTaskList(name: string): Observable<TaskList> { // Backend POST /gestao-tarefas/lists expects {"name": "listName"}
    return this.http.post<TaskList>(this.apiUrl, { name }).pipe(catchError(this.handleError));
  }

  updateTaskListName(id: number, newName: string): Observable<TaskList> {
    return this.http.patch<TaskList>(`${this.apiUrl}/${id}/name`, { name: newName }).pipe(
      catchError(this.handleError)
    );
  }

  deleteTaskList(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  getTasksByListId(listId: number): Observable<Tarefa[]> {
    return this.http.get<Tarefa[]>(`${this.apiUrl}/${listId}/tasks`).pipe(catchError(this.handleError));
  }

  addTaskToList(listId: number, taskId: number): Observable<void> {
    // Backend POST /{listId}/tasks takes @RequestBody Long taskId (raw long)
    return this.http.post<void>(`${this.apiUrl}/${listId}/tasks`, taskId, {
      headers: { 'Content-Type': 'application/json' } // Or 'text/plain' if backend needs it for raw Long
    }).pipe(catchError(this.handleError));
  }

  removeTaskFromList(listId: number, taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${listId}/tasks/${taskId}`).pipe(catchError(this.handleError));
  }

  // ... other methods for TaskListController endpoints ...
  // getTasksFilteredByStatus(listId: number, status: string): Observable<Tarefa[]>
  // getTasksFilteredByResponsible(listId: number, responsible: string): Observable<Tarefa[]>
  // getTasksFilteredByPriority(listId: number, priority: number): Observable<Tarefa[]>

}
