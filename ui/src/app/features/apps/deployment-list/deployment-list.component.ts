import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder } from '@angular/forms';

// NgZorro imports
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';

// Services & Models
import { ApiService } from '@core/services/api.service';
import { Deployment, Package, DeploymentMetrics, DeploymentEnvironment } from '@core/models/deployment.model';
import { Release } from '@core/models/release.model';

@Component({
  selector: 'app-deployment-list',
  standalone: true,
  template: ``,
})
export class DeploymentListComponent implements OnInit {
  private fb = inject(FormBuilder);
  appName = '';
  currentEnvironment: DeploymentEnvironment = 'Production';
  deployments: Deployment[] = [];
  releases: Release[] = [];
  loading = false;

  settingsForm = this.fb.group({
    enabled: [true],
    isMandatory: [false],
    rollout: [100],
    description: ['']
  });

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.appName = this.route.snapshot.params['name'];
    this.loadDeployments();
  }

  loadDeployments() {
    this.loading = true;
    this.api.getDeployments(this.appName).subscribe({
      next: (deployments) => {
        this.deployments = deployments;
        this.loadReleases();
        this.loading = false;
      },
      error: () => {
        // this.message.error('Failed to load deployments');
        this.loading = false;
      }
    });
  }

  loadReleases() {
    this.api.getDeploymentReleases(this.appName, this.currentEnvironment)
      .subscribe({
        next: (releases) => {
          this.releases = releases;
        },
        // error: () => this.message.error('Failed to load releases')
      });
  }

  changeEnvironment(env: DeploymentEnvironment) {
    this.currentEnvironment = env;
    this.loadReleases();
  }
}
