import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-content">
      <button class="btn" routerLink="/" style="margin-bottom:1em;">← Back</button>
      <h1>About</h1>
      <p>
        Libreng Kain is a local food donation platform designed to connect donors and recipients in the community.
        Our mission is to reduce food waste and help those in need by making food sharing easy and accessible.
      </p>
      <p>
        This project is open source and made for community sharing.
      </p>
    </div>
  `
})
export class AboutComponent {}
