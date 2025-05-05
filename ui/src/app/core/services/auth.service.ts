// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '@env/environment';

export type AuthProvider = 'github' | 'microsoft';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private authState$ = new BehaviorSubject<boolean>(false);
  private loginWindow: Window | null = null;
  private loginCheckInterval: any;

  constructor(private http: HttpClient) {
    this.checkAuth();
  }

  loginWithProvider(provider: string) {
    const popup = window.open(`${this.apiUrl}/auth/login/${provider}?isUi=true`, '_blank', 'width=600,height=600');
  
    // Listen for token from popup
    window.addEventListener('message', (event) => {
        console.log(event);
      if (event.data?.token) {
        localStorage.setItem('token', event.data.token);
        this.authState$.next(true);
      }
    });
  }

  checkAuth(): void {
    const token = localStorage.getItem('accessToken');
    this.authState$.next(!!token);
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    this.authState$.next(false);
  }

  isAuthenticated(): Observable<boolean> {
    return this.authState$.asObservable();
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }
}