export interface Release {
  id: string;
  releaseTime: number;
  appVersion: string;
  description?: string;
  isMandatory: boolean;
  rollout: number;
  size?: number;
  label: string;
  packageHash: string;
  blobUrl?: string;
  diffPackageMap?: {
    [version: string]: {
      size: number;
      url: string;
    };
  };
}
