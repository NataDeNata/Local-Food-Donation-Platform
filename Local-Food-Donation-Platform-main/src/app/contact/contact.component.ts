import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  standalone: true,
  template: `
    <div class="page-content">
      <button class="btn" routerLink="/" style="margin-bottom:1em;">← Back</button>
      <h1>Contact</h1>
      <p>
        For questions, suggestions, or support, please email us at:
        <a href="mailto:support&#64;librengkain.com">support&#64;librengkain.com</a>
      </p>
      <p>
        You may also reach out via our Facebook page or through the feedback form on this site.
      </p>
    </div>
  `
})
export class ContactComponent {}
