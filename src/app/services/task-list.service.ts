import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TaskList, Tarefa } from '../models';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class TaskListService {
  private apiUrl = `${environment.apiUrl}/gestao-tarefas/lists`;
  private http = inject(HttpClient);

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Full API Error Object from TaskListService:', error);
    let errorMessage = `An unknown error occurred in TaskListService! URL: ${error.url}, Status: ${error.status}`;
    if (error.error instanceof ErrorEvent) { errorMessage = `[CLIENT_ERROR - TaskListService] ${error.error.message}`;
    } else if (error.status === 0) { errorMessage = `[NETWORK_ERROR - TaskListService] Could not connect. URL: ${error.url}. Is backend running & proxy configured?`;
    } else {
      let backendMessage = 'No additional details from backend.';
      if (error.error) {
        if (typeof error.error === 'string') {
          if (error.error.trim().toLowerCase().startsWith('<!doctype html>') || error.error.trim().toLowerCase().startsWith('<html lang="">')) {
            backendMessage = 'Server returned HTML, not JSON. Proxy issue or wrong API endpoint?';
          } else { backendMessage = error.error;}
        } else if (error.error.message) { backendMessage = error.error.message;
        } else if (error.error.error) { backendMessage = error.error.error + (error.error.path ? ` on path ${error.error.path}` : '');
        } else { try { backendMessage = JSON.stringify(error.error); } catch (e) { backendMessage = 'Unparseable error body.'; }}
      }
      errorMessage = `[SERVER_ERROR - TaskListService] Code: ${error.status}. StatusText: ${error.statusText}. Message: ${error.message || 'N/A'}. Backend: ${backendMessage}`;
    }
    console.error('Formatted API Error (TaskListService):', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  getTaskLists(): Observable<TaskList[]> {
    return this.http.get<TaskList[]>(this.apiUrl).pipe(catchError(this.handleError));
  }

  createTaskList(name: string): Observable<void> {
    return this.http.post<void>(this.apiUrl, { name }).pipe(catchError(this.handleError));
  }

  updateTaskListName(id: number, newName: string): Observable<TaskList> {
    return this.http.patch<TaskList>(`${this.apiUrl}/${id}/name`, { name: newName }).pipe(catchError(this.handleError));
  }

  deleteTaskList(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  // GET /{id}/tasks - This was ambiguous. Assuming it's an alias for getAllTasksInList or a simpler version.
  // Let's use getAllTasksInList for clarity as per backend controller.
  // getTasksByListId(listId: number): Observable<Tarefa[]> {
  //   return this.http.get<Tarefa[]>(`${this.apiUrl}/${listId}/tasks`).pipe(catchError(this.handleError));
  // }

  addTaskToList(listId: number, taskId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${listId}/tasks`, taskId, { headers: { 'Content-Type': 'application/json' }})
      .pipe(catchError(this.handleError));
  }

  removeTaskFromList(listId: number, taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${listId}/tasks/${taskId}`).pipe(catchError(this.handleError));
  }

  getTaskByIdInList(listId: number, taskId: number): Observable<Tarefa> {
    return this.http.get<Tarefa>(`${this.apiUrl}/${listId}/tasks/${taskId}`).pipe(catchError(this.handleError));
  }

  getAllTasksInList(listId: number): Observable<Tarefa[]> {
    return this.http.get<Tarefa[]>(`${this.apiUrl}/${listId}/tasks/allTasks`).pipe(catchError(this.handleError));
  }

  getTasksFilteredByStatus(listId: number, status: string): Observable<Tarefa[]> {
    let params = new HttpParams().set('status', status);
    return this.http.get<Tarefa[]>(`${this.apiUrl}/${listId}/tasks/filterByStatus`, { params }).pipe(catchError(this.handleError));
  }

  getTasksFilteredByResponsible(listId: number, responsible: string): Observable<Tarefa[]> {
    let params = new HttpParams().set('responsible', responsible);
    return this.http.get<Tarefa[]>(`${this.apiUrl}/${listId}/tasks/filterByResponsible`, { params }).pipe(catchError(this.handleError));
  }

  getTasksFilteredByPriority(listId: number, priority: number): Observable<Tarefa[]> {
    let params = new HttpParams().set('priority', priority.toString());
    return this.http.get<Tarefa[]>(`${this.apiUrl}/${listId}/tasks/filterByPriority`, { params }).pipe(catchError(this.handleError));
  }
}
