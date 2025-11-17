import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-read-me',
  imports: [MatCardModule, MatDividerModule],
  templateUrl: './read-me.html',
  styleUrl: './read-me.scss'
})
export class ReadMe {

}
