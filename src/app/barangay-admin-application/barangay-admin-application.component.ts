import { Component } from '@angular/core';
import { BARANGAYS } from '../models/barangays';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Firestore, collection, query, where, getDocs, updateDoc, doc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';

@Component({
  selector: 'barangay-admin-application',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './barangay-admin-application.component.html',
  styleUrls: ['./barangay-admin-application.component.css']
})
export class BarangayAdminApplicationComponent {
  barangays = BARANGAYS;
  name = '';
  email = '';
  barangay = '';
  position = '';
  contact = '';
  pdfFile: File | null = null;
  photoFiles: File[] = [];
  submitted = false;
  loading = false;
  authService = inject(AuthService);
  firestore = inject(Firestore);
  storage = inject(Storage);

  onPdfChange(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.pdfFile = file;
    } else {
      this.pdfFile = null;
      alert('Please upload a valid PDF file.');
    }
  }

  onPhotosChange(event: any) {
    const files = Array.from(event.target.files) as File[];
    this.photoFiles = files.filter(f => f.type.startsWith('image/'));
    if (files.length !== this.photoFiles.length) {
      alert('Only image files are allowed for photos.');
    }
  }

  async submitForm() {
    if (!this.name || !this.email || !this.barangay || !this.position || !this.contact || !this.pdfFile || this.photoFiles.length === 0) {
      alert('Please fill out all fields and attach required files.');
      return;
    }
    this.loading = true;
    try {
      // Normalize email to lowercase for lookup
      const normalizedEmail = this.email.trim().toLowerCase();
      const usersRef = collection(this.firestore, 'users');
      let q = query(usersRef, where('email', '==', normalizedEmail));
      let snap = await getDocs(q);
      // If not found, try original trimmed email (in case data is not normalized)
      if (snap.empty) {
        q = query(usersRef, where('email', '==', this.email.trim()));
        snap = await getDocs(q);
      }
      if (!snap.empty) {
        const userDoc = snap.docs[0];
        // Upload PDF
        let pdfUrl = '';
        if (this.pdfFile) {
          const pdfRef = ref(this.storage, `admin-applications/${userDoc.id}/certificate.pdf`);
          await uploadBytes(pdfRef, this.pdfFile);
          pdfUrl = await getDownloadURL(pdfRef);
        }
        // Upload photos
        const photoUrls: string[] = [];
        for (let i = 0; i < this.photoFiles.length; i++) {
          const photo = this.photoFiles[i];
          const photoRef = ref(this.storage, `admin-applications/${userDoc.id}/photo_${i}`);
          await uploadBytes(photoRef, photo);
          const url = await getDownloadURL(photoRef);
          photoUrls.push(url);
        }
        // Update roles to include barangay admin for the selected barangay
        const prevRoles = userDoc.data()['roles'] || {};
        const updatedRoles = { ...prevRoles, barangayAdmin: this.barangay };
        await updateDoc(doc(this.firestore, 'users', userDoc.id), {
          pendingAdmin: true,
          name: this.name,
          barangay: this.barangay,
          position: this.position,
          contact: this.contact,
          pdfUrl,
          photoUrls,
          roles: updatedRoles
        });
        this.submitted = true;
      } else {
        alert('Email does not exist. Please use a registered email.');
      }
    } finally {
      this.loading = false;
    }
  }
}
