// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService } from './base.service';
import { App } from '../models/app.model';
import {
  DeploymentMetrics,
  Package,
  Deployment,
  DeploymentEnvironment,
} from '../models/deployment.model';
import { Release } from '@core/models/release.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService extends BaseApiService {
  // Apps
  getApps(): Observable<App[]> {
    return this.get<AppsResponse>('/apps').pipe(map((res) => res.apps));
  }

  getApp(name: string): Observable<App> {
    return this.get<AppResponse>(`/apps/${name}`).pipe(map((res) => res.app));
  }

  createApp(name: string, os: string, platform: string): Observable<App> {
    return this.post<AppResponse>('/apps', { name, os, platform }).pipe(
      map((res) => res.app)
    );
  }

  renameApp(oldName: string, newName: string): Observable<App> {
    return this.patch<AppResponse>(`/apps/${oldName}`, { name: newName }).pipe(
      map((res) => res.app)
    );
  }

  deleteApp(name: string): Observable<void> {
    return this.delete(`/apps/${name}`);
  }

  // Deployments
  getDeployments(appName: string): Observable<Deployment[]> {
    return this.get<DeploymentsResponse>(`/apps/${appName}/deployments`).pipe(
      map((res) => res.deployments)
    );
  }

  getDeployment(
    appName: string,
    deploymentName: string
  ): Observable<Deployment> {
    return this.get<DeploymentResponse>(
      `/apps/${appName}/deployments/${deploymentName}`
    ).pipe(map((res) => res.deployment));
  }

  addDeployment(
    appName: string,
    deploymentName: string
  ): Observable<Deployment> {
    return this.post<DeploymentResponse>(`/apps/${appName}/deployments`, {
      name: deploymentName,
    }).pipe(map((res) => res.deployment));
  }

  renameDeployment(
    appName: string,
    oldName: string,
    newName: string
  ): Observable<Deployment> {
    return this.patch<DeploymentResponse>(
      `/apps/${appName}/deployments/${oldName}`,
      { name: newName }
    ).pipe(map((res) => res.deployment));
  }

  deleteDeployment(appName: string, deploymentName: string): Observable<void> {
    return this.delete(`/apps/${appName}/deployments/${deploymentName}`);
  }

  // Releases
  getReleaseHistory(
    appName: string,
    deploymentName: string
  ): Observable<Package[]> {
    return this.get<HistoryResponse>(
      `/apps/${appName}/deployments/${deploymentName}/history`
    ).pipe(map((res) => res.history));
  }

  clearHistory(appName: string, deploymentName: string): Observable<void> {
    return this.delete(
      `/apps/${appName}/deployments/${deploymentName}/history`
    );
  }

  release(
    appName: string,
    deploymentName: string,
    packageInfo: Partial<Package>
  ): Observable<Package> {
    return this.post<PackageResponse>(
      `/apps/${appName}/deployments/${deploymentName}/release`,
      packageInfo
    ).pipe(map((res) => res.package));
  }

  promote(
    appName: string,
    sourceDeploymentName: string,
    destDeploymentName: string,
    packageInfo?: Partial<Package>
  ): Observable<Package> {
    return this.post<PackageResponse>(
      `/apps/${appName}/deployments/${sourceDeploymentName}/promote/${destDeploymentName}`,
      packageInfo || {}
    ).pipe(map((res) => res.package));
  }

  rollback(
    appName: string,
    deploymentName: string,
    targetRelease?: string
  ): Observable<Package> {
    const url = targetRelease
      ? `/apps/${appName}/deployments/${deploymentName}/rollback/${targetRelease}`
      : `/apps/${appName}/deployments/${deploymentName}/rollback`;
    return this.post<PackageResponse>(url, {}).pipe(map((res) => res.package));
  }

  // Metrics
  getMetrics(
    appName: string,
    deploymentName: string
  ): Observable<DeploymentMetrics> {
    return this.get<MetricsResponse>(
      `/apps/${appName}/deployments/${deploymentName}/metrics`
    ).pipe(map((res) => res.metrics));
  }

  // Collaborators
  getCollaborators(
    appName: string
  ): Observable<{ [email: string]: CollaboratorProperties }> {
    return this.get<CollaboratorsResponse>(
      `/apps/${appName}/collaborators`
    ).pipe(map((res) => res.collaborators));
  }

  addCollaborator(appName: string, email: string): Observable<void> {
    return this.post(`/apps/${appName}/collaborators/${email}`, {});
  }

  removeCollaborator(appName: string, email: string): Observable<void> {
    return this.delete(`/apps/${appName}/collaborators/${email}`);
  }

  // Access Keys
  removeAccessKey(accessKey: string): Observable<void> {
    return this.delete(`/access_keys/${accessKey}`);
  }
}
