import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class ReadMe implements OnInit, OnDestroy {
  view: 'overview' | 'instructions' | 'api' = 'overview';

  setView(v: 'overview' | 'instructions' | 'api') {
    this.view = v;
  }

  // setView handles switching between instructions, overview, and inline API views

}
