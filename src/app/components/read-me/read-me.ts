import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { API } from '../apis/apis';

@Component({
  selector: 'app-read-me',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDividerModule, MatButtonModule, RouterModule, API],
  templateUrl: './read-me.html',
  styleUrls: ['./read-me.scss']
})
export class ReadMe {
  view: 'overview' | 'instructions' | 'api' | 'config' | 'initialSetup' = 'overview';

  setView(v: 'overview' | 'instructions' | 'api' | 'config' | 'initialSetup') {
    this.view = v;
  }

  // setView handles switching between instructions, overview, and inline API views

}
