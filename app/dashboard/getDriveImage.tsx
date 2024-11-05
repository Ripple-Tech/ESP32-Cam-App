"use client"; // to ensure component renders on the client-side for alerts

import { oauth2Client } from "@/utils/google-auth";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { FC, useEffect, useState } from "react";
import { promises as fs } from "fs";
import path from "path";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import Image from "next/image";

interface FileProps {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  mimeType: string;
  tempFilePath?: string;
}

const DriveImage: FC = async () => {
  const visionClient = new ImageAnnotatorClient();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const knownImages = [
    { src: "/assets/image1.jpg", name: "Image 1" },
    { src: "/assets/image2.jpg", name: "Image 2" },
    { src: "/assets/image3.jpg", name: "Image 3" },
  ];

  const cookieStore = cookies();
  const accessToken = cookieStore.get("google_access_token")?.value;
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive("v3");
  let files: FileProps[] = [];

  try {
    const result = await drive.files.list({
      auth: oauth2Client,
      pageSize: 1,
      orderBy: "createdTime desc",
      fields: "files(id, name, webViewLink, webContentLink, mimeType)",
      q: "mimeType contains 'image/'",
    });
    files = result.data.files as FileProps[];
  } catch (error) {
    console.error("Failed to fetch files:", error);
    return <div>Failed to fetch files</div>;
  }

  async function saveImageToTemp(imageData: ArrayBuffer, filename: string): Promise<string> {
    const tempDir = path.join(process.cwd(), "public", "temp");
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, filename);
    await fs.writeFile(tempFilePath, Buffer.from(imageData));
    return `/temp/${filename}`;
  }

  async function detectFaces(filePath: string) {
    const [result] = await visionClient.faceDetection(filePath);
    return result?.faceAnnotations || [];
  }

  const processedFiles = await Promise.all(
    files.map(async (file) => {
      if (file.webContentLink) {
        const response = await fetch(file.webContentLink);
        const imageData = await response.arrayBuffer();
        const tempFilePath = await saveImageToTemp(imageData, `${file.id}.jpg`);
        const driveFaces = await detectFaces(tempFilePath);

        // Compare with known images
        for (const knownImage of knownImages) {
          const knownImagePath = path.join(process.cwd(), "public", knownImage.src);
          const knownFaces = await detectFaces(knownImagePath);

          if (driveFaces.length > 0 && knownFaces.length > 0) {
            setAlertMessage(`Face match found between ${file.name} and ${knownImage.name}`);
            break;
          } else {
            setAlertMessage(`No face match found for ${file.name} with ${knownImage.name}`);
          }
        }

        return { ...file, tempFilePath };
      } else {
        return file;
      }
    })
  );

  // Client-side effect to show alert when alertMessage changes
  useEffect(() => {
    if (alertMessage) {
      alert(alertMessage);
    }
  }, [alertMessage]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1>Google Drive Photos</h1>
        <ul>
          {processedFiles.map((file) => (
            <li key={file.id}>
              <h2>{file.name}</h2>
              <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                <img
                  src={file.tempFilePath || `https://drive.google.com/uc?export=view&id=${file.id}`}
                  alt={file.name}
                  width={200}
                  height={200}
                  style={{ objectFit: "cover" }}
                />
              </a>
            </li>
          ))}
        </ul>

        <h1 className="text-xl font-bold mb-6">Known Images</h1>
        <div className="grid grid-cols-3 gap-4">
          {knownImages.map((image) => (
            <li
              key={image.name}
              className="list-none bg-gray-200 p-4 rounded-md shadow-md flex flex-col items-center"
            >
              <Image src={image.src} alt={image.name} width={150} height={150} className="rounded-md" />
              <p className="mt-2 text-sm text-center font-medium">{image.name}</p>
            </li>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DriveImage;
