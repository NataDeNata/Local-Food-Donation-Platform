import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import multer from "multer";

admin.initializeApp();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const bucket = admin.storage().bucket();
    const file = req.file;

    if (!file) {
      res.status(400).send("No file uploaded.");
      return;
    }

    const fileName = `donations/${Date.now()}-${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    await fileUpload.save(file.buffer, {
      contentType: file.mimetype,
    });

    const [url] = await fileUpload.getSignedUrl({
      action: "read",
      expires: "03-01-2030",
    });

    res.send({ downloadUrl: url });
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload failed.");
  }
});

exports.api = functions.https.onRequest(app);