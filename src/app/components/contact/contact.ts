import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { Contact, ContactMessage } from '../../services/contact';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatInputModule, MatButtonModule, CommonModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss']
})
export class ContactUsComponent {
  submitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(private contactService: Contact) {}

  onSubmit(form: NgForm) {
    if (!form.valid) return;

    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    const message: ContactMessage = form.value;

    this.contactService.sendMessage(message).subscribe({
      next: (res) => {
        this.successMessage = res.message;
        form.resetForm();
        this.submitting = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Something went wrong';
        this.submitting = false;
      }
    });
  }
}
