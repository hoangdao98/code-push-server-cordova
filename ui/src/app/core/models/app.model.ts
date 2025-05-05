import { Deployment } from './deployment.model';

export interface App {
  name: string;
  os: string;
  platform: string;
  deployments: string[];
  collaborators: {
    [email: string]: {
      permission: 'Owner' | 'Collaborator';
      isCurrentAccount?: boolean;
    }
  };
}