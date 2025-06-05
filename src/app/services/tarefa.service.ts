import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators'; // Added map
import { Tarefa } from '../models';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class TarefaService {
  private apiUrl = `${environment.apiUrl}/gestao-tarefas`;
  private http = inject(HttpClient);

  constructor() { }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Full API Error Object from TarefaService:', error);
    let errorMessage = `An unknown error occurred! URL: ${error.url}, Status: ${error.status}`;
    if (error.error instanceof ErrorEvent) {
      errorMessage = `[CLIENT_ERROR] ${error.error.message}`;
    } else if (error.status === 0) {
      errorMessage = `[NETWORK_ERROR] Could not connect. URL: ${error.url}. Is backend running & proxy configured?`;
    } else {
      let backendMessage = 'No additional details from backend.';
      if (error.error) {
        if (typeof error.error === 'string') {
          if (error.error.trim().toLowerCase().startsWith('<!doctype html>') || error.error.trim().toLowerCase().startsWith('<html lang="">')) {
            backendMessage = 'Server returned HTML, not JSON. Proxy issue or wrong API endpoint?';
          } else {
            backendMessage = error.error;
          }
        } else if (error.error.message) {
          backendMessage = error.error.message;
        } else if (error.error.error) {
          backendMessage = error.error.error + (error.error.path ? ` on path ${error.error.path}` : '');
        } else {
          try { backendMessage = JSON.stringify(error.error); } catch (e) { backendMessage = 'Unparseable error body.'; }
        }
      }
      errorMessage = `[SERVER_ERROR] Code: ${error.status}. StatusText: ${error.statusText}. Message: ${error.message || 'N/A'}. Backend: ${backendMessage}`;
    }
    console.error('Formatted API Error (TarefaService):', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  getTarefas(filters?: { status?: string, priority?: number, responsible?: string }): Observable<Tarefa[]> {
    let params = new HttpParams();

    if (filters) {
      // Priority filter (uses specific backend endpoint)
      if (filters.priority !== undefined && filters.priority !== null) {
        const requestUrl = `${this.apiUrl}/by-priority`;
        params = params.set('priority', filters.priority.toString());
        console.log(`[TarefaService] GET ${requestUrl} with params:`, params.toString());
        return this.http.get<Tarefa[]>(requestUrl, { params }).pipe(catchError(this.handleError));
      }

      // Responsible filter (uses specific backend endpoint)
      if (filters.responsible && filters.responsible.trim() !== '') {
        const requestUrl = `${this.apiUrl}/by-responsible`;
        params = params.set('responsible', filters.responsible);
        console.log(`[TarefaService] GET ${requestUrl} with params:`, params.toString());
        return this.http.get<Tarefa[]>(requestUrl, { params }).pipe(catchError(this.handleError));
      }

      // Status filter (client-side if no priority/responsible filter was applied)
      if (filters.status && filters.status.trim() !== '') {
        console.log(`[TarefaService] Applying CLIENT-SIDE filter for status: '${filters.status}'. Fetching all tasks first.`);
        return this.http.get<Tarefa[]>(this.apiUrl).pipe(
          map(tasks => tasks.filter(task => task.status === filters!.status)), // Non-null assertion for filters.status
          catchError(this.handleError)
        );
      }
    }

    // Default: get all tasks (no filters, or only an empty status filter)
    console.log(`[TarefaService] GET ${this.apiUrl} (all tasks)`);
    return this.http.get<Tarefa[]>(this.apiUrl, { params }).pipe(
      catchError(this.handleError)
    );
  }
  createTarefa(tarefa: Tarefa): Observable<Tarefa> {
    console.log(`[TarefaService] POST ${this.apiUrl} with payload:`, tarefa);
    return this.http.post<Tarefa>(this.apiUrl, tarefa).pipe(
      tap(createdTask => console.log('[TarefaService] Created Task:', createdTask)),
      catchError(this.handleError)
    );
  }

  updateTarefa(id: number, tarefa: Tarefa): Observable<Tarefa> {
    const requestUrl = `${this.apiUrl}/${id}`;
    console.log(`[TarefaService] PUT ${requestUrl} with payload:`, tarefa);
    return this.http.put<Tarefa>(requestUrl, tarefa).pipe(
      tap(updatedTask => console.log('[TarefaService] Updated Task:', updatedTask)),
      catchError(this.handleError)
    );
  }

  deleteTarefa(id: number): Observable<void> {
    const requestUrl = `${this.apiUrl}/${id}`;
    console.log(`[TarefaService] DELETE ${requestUrl}`);
    return this.http.delete<void>(requestUrl).pipe(
      tap(() => console.log(`[TarefaService] Deleted Task with id: ${id}`)),
      catchError(this.handleError)
    );
  }

  updateTaskStatus(id: number, novoStatus: string): Observable<Tarefa> {
    const requestUrl = `${this.apiUrl}/${id}/status`;
    const payload = JSON.stringify(novoStatus);
    console.log(`[TarefaService] PATCH ${requestUrl} with payload: ${payload}`);
    return this.http.patch<Tarefa>(requestUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      tap(updatedTask => console.log('[TarefaService] Updated Task Status:', updatedTask)),
      catchError(this.handleError)
    );
  }
}
