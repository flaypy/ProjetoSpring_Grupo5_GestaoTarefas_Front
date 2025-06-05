import { ApplicationConfig, importProvidersFrom, ErrorHandler } from '@angular/core'; // Added ErrorHandler
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';

// Basic global error handler (optional, but can be helpful for unhandled issues)
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error("Global Uncaught Error:", error);
    // You could add logic here to send errors to a logging service
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideAnimations(), // Ensures animations are set up
    provideHttpClient(withInterceptorsFromDi()),
    provideNativeDateAdapter(),
    importProvidersFrom([
      MatDialogModule,
      MatSnackBarModule,
      MatNativeDateModule,
    ]),
    // { provide: ErrorHandler, useClass: GlobalErrorHandler } // Optional: register global error handler
  ]
};
