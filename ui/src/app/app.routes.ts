import { Routes } from '@angular/router';
import { AppListComponent } from './features/apps/app-list/app-list.component';
import { AppDetailComponent } from './features/apps/app-detail/app-detail.component';
import { DeploymentListComponent } from './features/apps/deployment-list/deployment-list.component';
import { LoginComponent } from './features/auth/login/login.component';

export const routes: Routes = [
  { 
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'apps',
    children: [
      { path: '', component: AppListComponent },
      {
        path: ':name/deployments',
        component: DeploymentListComponent,
        // canActivate: [AuthGuard]
      }
    ]
  },
];