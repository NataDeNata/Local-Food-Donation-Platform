import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div class="home-page" style="max-width:600px;margin:2rem auto;padding:2rem 1rem;text-align:center;">
      <h1>Welcome to Libreng Kain!</h1>
      <p style="font-size:1.2em;margin-top:1.5em;">
        Libreng Kain is a local food donation platform that connects donors and recipients in your community.
        <br><br>
        Our mission is to reduce food waste and help those in need by making food sharing easy, safe, and accessible for everyone.
        <br><br>
        Join us in building a caring and sustainable community!
      </p>
    </div>
  `
})
export class HomeComponent {}
