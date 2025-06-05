import { Component, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
// MatIconRegistry and DomSanitizer are NOT used here anymore due to simplified icon usage
// import { MatIconRegistry } from '@angular/material/icon';
// import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Task Manager Frontend';
  // private matIconRegistry = inject(MatIconRegistry); // Removed
  // private domSanitizer = inject(DomSanitizer); // Removed

  constructor() {
    // Custom SVG icon registration removed for simplicity to rule out icon issues
    // If you add custom SVGs later, ensure they are valid and correctly registered.
  }

  ngOnInit() { }
  getYear(): number { return new Date().getFullYear(); }
}
