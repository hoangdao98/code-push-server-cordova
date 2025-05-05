// src/app/features/auth/login/login.component.ts
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AuthService, AuthProvider } from '@core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <h2>Login with</h2>
      <div class="login-buttons">
        <button nz-button nzType="primary" (click)="login('github')">
          <i nz-icon nzType="github"></i>
          GitHub
        </button>
        <button nz-button nzType="primary" (click)="login('microsoft')">
          <i nz-icon nzType="windows"></i>
          Microsoft
        </button>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      max-width: 400px;
      margin: 100px auto;
      text-align: center;
    }
    .login-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-top: 24px;
    }
  `]
})
export class LoginComponent {
  constructor(private auth: AuthService) {}

  login(provider: AuthProvider) {
    this.auth.loginWithProvider(provider);
  }
}