// src/app/core/services/base-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class BaseApiService {
  protected apiUrl = environment.apiUrl;

  constructor(protected http: HttpClient) {}

  protected createHeaders(): HttpHeaders {
    let headers = new HttpHeaders()
      .set('Accept', 'application/vnd.code-push.v2+json')
      .set('Content-Type', 'application/json');
    
    const token = localStorage.getItem('token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  protected get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}${path}`, {
      headers: this.createHeaders(),
      params
    }).pipe(
      catchError(this.handleError)
    );
  }

  protected post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}${path}`, body, {
      headers: this.createHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  protected put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}${path}`, body, {
      headers: this.createHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  protected patch<T>(path: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.apiUrl}${path}`, body, {
      headers: this.createHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  protected delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}${path}`, {
      headers: this.createHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    return throwError(error);
  }
}