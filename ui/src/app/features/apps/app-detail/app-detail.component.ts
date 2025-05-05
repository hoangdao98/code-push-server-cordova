import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzDescriptionsModule
  ],
  template: `
    <div class="p-4">
      <h2>App Details</h2>
      <nz-descriptions>
        <nz-descriptions-item label="Name">{{app?.name}}</nz-descriptions-item>
      </nz-descriptions>
    </div>
  `
})
export class AppDetailComponent {
  app: any;
}