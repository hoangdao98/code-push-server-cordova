export type DeploymentEnvironment = 'Production' | 'Staging';

export interface Deployment {
  name: DeploymentEnvironment;
  key: string;
  id: string;
  package: Package | null;
}

export interface Package {
  appVersion: string;
  blobUrl: string;
  description: any;
  isDisabled: boolean;
  isMandatory: boolean;
  label: string;
  packageHash: string;
  size: number;
  releaseMethod?: string;
  rollout?: number;
  uploadTime: number;
  diffPackageMap?: {[key: string]: {
    url: string;
    size: number;
  }};
}

export interface DeploymentMetrics {
  active: number;
  total: number;
  installed: number;
  downloaded: number;
  failed: number;
  rollbacks: number;
}