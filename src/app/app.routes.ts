import { Routes } from '@angular/router';
import { TaskListComponent } from './components/task-list/task-list.component';

export const routes: Routes = [
  { path: '', redirectTo: '/tasks', pathMatch: 'full' },
  { path: 'tasks', component: TaskListComponent, title: 'Task Management' },
  // Add other routes here if needed
  { path: '**', redirectTo: '/tasks' } // Wildcard route for a 404 or redirect
];
