import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { ApiService } from '@core/services/api.service';
import { App } from '@core/models/app.model';

@Component({
  selector: 'app-list',
  standalone: true,
  template: ``
})
export class AppListComponent implements OnInit {
  apps: App[] = [];
  loading = false;

  constructor(
    private api: ApiService,
    // private message: NzMessageService
  ) {}

  ngOnInit() {
    this.loadApps();
  }

  loadApps() {
    this.loading = true;
    this.api.getApps().subscribe({
      next: (apps) => {
        this.apps = apps;
        this.loading = false;
      },
      error: () => {
        // this.message.error('Failed to load apps');
        this.loading = false;
      }
    });
  }

  createApp(name: string, platform: string) {
    this.api.createApp(name, platform.toLowerCase(), platform)
      .subscribe({
        next: () => {
          // this.message.success('App created');
          this.loadApps();
        },
        // error: () => this.message.error('Failed to create app')
      });
  }

  deleteApp(app: App) {
    this.api.deleteApp(app.name).subscribe({
      next: () => {
        // this.message.success('App deleted');
        this.loadApps();
      },
      // error: () => this.message.error('Failed to delete app')
    });
  }
}