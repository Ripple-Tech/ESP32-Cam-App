import { oauth2Client } from "@/utils/google-auth";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { FC } from "react";
import axios from "axios";
import Image from "next/image";
import toast from "react-hot-toast";

interface FileProps {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  mimeType: string;
  tempFilePath?: string;
}

const FACE_API_KEY = `${process.env.FACE_API_KEY}`;
const FACE_API_SECRET = `${process.env.FACE_API_SECRET}`;
const knownImages = [
  { src: "/assets/image1.jpg", name: "Image 1" },
  { src: "/assets/image2.jpg", name: "Image 2" },
  { src: "/assets/image3.jpg", name: "Image 3" },
];

const DriveImage: FC = async () => {
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

  async function compareFace(driveImageBuffer: ArrayBuffer, knownImagePath: string) {
    const formData = new FormData();

    const blob = new Blob([driveImageBuffer], { type: "image/jpeg" });
    formData.append("api_key", FACE_API_KEY);
    formData.append("api_secret", FACE_API_SECRET);
    formData.append("image_file1", blob, "driveImage.jpg");

    const knownImageUrl = `${process.env.BASE_URL}${knownImagePath}`;
    formData.append("image_url2", knownImageUrl);

    try {
      const response = await axios.post("https://api-us.faceplusplus.com/facepp/v3/compare", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { confidence } = response.data;
      return confidence > 70;
    } catch (error) {
      console.error("Face comparison failed:", error);
      return false;
    }
  }

  const processedFiles = await Promise.all(
    files.map(async (file) => {
      if (file.webContentLink) {
        const response = await fetch(file.webContentLink);
        const imageData = await response.arrayBuffer();

        for (const knownImage of knownImages) {
          const match = await compareFace(imageData, knownImage.src);
          if (match) {
            toast.success(`Match found for ${file.name} with ${knownImage.name}`);
          } else {
            toast.error(`No match for ${file.name} with ${knownImage.name}`);
          }
        }

        const base64Image = `data:image/jpeg;base64,${Buffer.from(imageData).toString("base64")}`;
        return { ...file, tempFilePath: base64Image }; // Use base64 for <img> src
      } else {
        return file;
      }
    })
  );

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


// http://localhost:3000  http://localhost
// http://localhost:3000/auth/google/callback  http://localhost/auth/google/callback 