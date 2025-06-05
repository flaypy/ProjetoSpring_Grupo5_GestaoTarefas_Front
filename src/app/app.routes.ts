import { Routes } from '@angular/router';
import { TaskListComponent } from './components/task-list/task-list.component';
import { TaskListManagementComponent } from './components/task-list-management/task-list-management.component';
import { TasksInListComponent } from './components/tasks-in-list/tasks-in-list.component'; // Import new component

export const routes: Routes = [
  { path: '', redirectTo: '/task-lists', pathMatch: 'full' }, // Default to task lists view
  { path: 'tasks', component: TaskListComponent, title: 'Global Task Management' }, // For tasks not in any list
  { path: 'task-lists', component: TaskListManagementComponent, title: 'Task Lists Management' },
  { path: 'task-lists/:listId/tasks', component: TasksInListComponent, title: 'Tasks in List' }, // New route
  { path: '**', redirectTo: '/task-lists' } // Wildcard to task lists
];
