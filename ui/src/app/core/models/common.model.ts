import { App } from './app.model';
import { Deployment, Package, DeploymentMetrics } from './deployment.model';

export interface ApiResponse<T> {
  data: T;
}

export interface AppsResponse {
  apps: App[];
}

export interface AppResponse {
  app: App;
}

export interface DeploymentsResponse {
  deployments: Deployment[];
}

export interface DeploymentResponse {
  deployment: Deployment;
}

export interface PackageResponse {
  package: Package;
}

export interface HistoryResponse {
  history: Package[];
}

export interface MetricsResponse {
  metrics: DeploymentMetrics;
}

export interface CollaboratorsResponse {
  collaborators: { [email: string]: CollaboratorProperties };
}