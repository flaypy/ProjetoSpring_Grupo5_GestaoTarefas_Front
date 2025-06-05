import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Tarefa } from '../models';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class TarefaService {
  private apiUrl = `${environment.apiUrl}/gestao-tarefas`; // Base for individual (global) tasks
  private http = inject(HttpClient);

  constructor() { }

  private handleError(error: HttpErrorResponse, serviceName: string = 'TarefaService'): Observable<never> {
    console.error(`Full API Error Object from ${serviceName}:`, error);
    let errorMessage = `An unknown error occurred! URL: ${error.url}, Status: ${error.status}`;
    if (error.error instanceof ErrorEvent) {
      errorMessage = `[CLIENT_ERROR - ${serviceName}] ${error.error.message}`;
    } else if (error.status === 0) {
      errorMessage = `[NETWORK_ERROR - ${serviceName}] Could not connect. URL: ${error.url}. Is backend running & proxy configured?`;
    } else {
      let backendMessage = 'No additional details from backend.';
      if (error.error) {
        if (typeof error.error === 'string') {
          if (error.error.trim().toLowerCase().startsWith('<!doctype html>') || error.error.trim().toLowerCase().startsWith('<html lang="">')) {
            backendMessage = 'Server returned HTML, not JSON. Proxy issue or wrong API endpoint?';
          } else { backendMessage = error.error; }
        } else if (error.error.message) { backendMessage = error.error.message;
        } else if (error.error.error) { backendMessage = error.error.error + (error.error.path ? ` on path ${error.error.path}` : '');
        } else { try { backendMessage = JSON.stringify(error.error); } catch (e) { backendMessage = 'Unparseable error body.'; }}
      }
      errorMessage = `[SERVER_ERROR - ${serviceName}] Code: ${error.status}. StatusText: ${error.statusText}. Message: ${error.message || 'N/A'}. Backend: ${backendMessage}`;
    }
    console.error(`Formatted API Error (${serviceName}):`, errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // This method is for GLOBAL tasks (not associated with a specific list via listId in filter)
  getTarefas(filters?: { status?: string, priority?: number, responsible?: string }): Observable<Tarefa[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.priority !== undefined && filters.priority !== null) {
        const requestUrl = `${this.apiUrl}/by-priority`;
        params = params.set('priority', filters.priority.toString());
        return this.http.get<Tarefa[]>(requestUrl, { params }).pipe(catchError(err => this.handleError(err)));
      }
      if (filters.responsible && filters.responsible.trim() !== '') {
        const requestUrl = `${this.apiUrl}/by-responsible`;
        params = params.set('responsible', filters.responsible);
        return this.http.get<Tarefa[]>(requestUrl, { params }).pipe(catchError(err => this.handleError(err)));
      }
      if (filters.status && filters.status.trim() !== '') {
        // Client-side filtering for global tasks by status
        return this.http.get<Tarefa[]>(this.apiUrl).pipe(
          map(tasks => tasks.filter(task => task.status === filters!.status && !task.taskListId)), // Only global tasks
          catchError(err => this.handleError(err))
        );
      }
    }
    // Fetch only tasks that are not associated with any list (taskListId is null or undefined)
    return this.http.get<Tarefa[]>(this.apiUrl).pipe(
      map(tasks => tasks.filter(task => !task.taskListId)), // Ensure only global tasks
      catchError(err => this.handleError(err))
    );
  }

  getTarefaById(id: number): Observable<Tarefa> {
    return this.http.get<Tarefa>(`${this.apiUrl}/${id}`).pipe(catchError(err => this.handleError(err)));
  }

  // Used for creating both global tasks and tasks within a list
  // If task.taskListId is provided, the backend should associate it.
  createTarefa(tarefa: Tarefa): Observable<Tarefa> {
    // The backend Task entity has `private TaskList taskList;`
    // Spring Data REST or Jackson should be able to map `taskListId` to this if configured
    // or if we send `taskList: { id: tarefa.taskListId }`.
    // For now, sending taskListId directly in the Tarefa payload.
    // If backend expects taskList object:
    // const payload = {...tarefa, taskList: tarefa.taskListId ? { id: tarefa.taskListId } : null };
    // delete payload.taskListId; // if taskList object is sent
    // For simplicity, assuming backend can handle taskListId directly or map it.
    console.log(`[TarefaService] POST ${this.apiUrl} with payload:`, tarefa);
    return this.http.post<Tarefa>(this.apiUrl, tarefa).pipe(catchError(err => this.handleError(err)));
  }

  updateTarefa(id: number, tarefa: Tarefa): Observable<Tarefa> {
    // Similar to create, ensure taskListId or taskList object is handled correctly.
    console.log(`[TarefaService] PUT ${this.apiUrl}/${id} with payload:`, tarefa);
    return this.http.put<Tarefa>(`${this.apiUrl}/${id}`, tarefa).pipe(catchError(err => this.handleError(err)));
  }

  deleteTarefa(id: number): Observable<void> { // This deletes a global task
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(err => this.handleError(err)));
  }

  updateTaskStatus(id: number, novoStatus: string): Observable<Tarefa> {
    const payload = JSON.stringify(novoStatus);
    return this.http.patch<Tarefa>(`${this.apiUrl}/${id}/status`, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(catchError(err => this.handleError(err)));
  }
}
