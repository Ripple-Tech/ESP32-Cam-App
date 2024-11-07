import { oauth2Client } from "@/utils/google-auth";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { FC } from "react";
import { promises as fs } from "fs";
import path from "path";
import Image from "next/image";
import axios from "axios";

interface FileProps {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  mimeType: string;
  tempFilePath?: string;
}

const FACE_API_KEY = "Qn8oogSw-9iohUmz0i73Bc_IY1PIezYp";
const FACE_API_SECRET = "J-TODW7FkMFfNxb0XHhzdZ5kkuOmr8qj";
const knownImages = [
  { src: "/assets/image1.jpg", name: "Image 1" },
 // { src: "/assets/image2.jpg", name: "Image 2" },
  //{ src: "/assets/image3.jpg", name: "Image 3" },
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

  async function saveImageToTemp(imageData: ArrayBuffer, filename: string): Promise<string> {
    const tempDir = path.join(process.cwd(), "public", "temp");
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, filename);
    await fs.writeFile(tempFilePath, Buffer.from(imageData));
    return `/temp/${filename}`; // Return relative path for public access
  }
  
  async function compareFace(driveImageUrl: string, knownImagePath: string) {
    const knownImageUrl = `${process.env.BASE_URL}${knownImagePath}`;
    
    try {
      const response = await axios.post("https://api-us.faceplusplus.com/facepp/v3/compare", null, {
        params: {
          api_key: FACE_API_KEY,
          api_secret: FACE_API_SECRET,
          image_url1: driveImageUrl, // Use the public Google Drive link directly
          image_url2: knownImageUrl,  // Local image converted to public URL
        },
      });
  
      const { confidence } = response.data;
      return confidence > 70; // Adjust threshold as necessary
    } catch (error) {
      console.error("Face comparison failed:", error);
      return false;
    }
  }
  
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


  const processedFiles = await Promise.all(
    files.map(async (file) => {
      if (file.webContentLink) {
        const response = await fetch(file.webContentLink);
        const imageData = await response.arrayBuffer();
        const tempFilePath = await saveImageToTemp(imageData, `${file.id}.jpg`);

        // Compare with each known image
        for (const knownImage of knownImages) {
          
          await delay(1000); // Delay of 1 second between each comparison request

          const match = await compareFace(tempFilePath, knownImage.src);
          if (match) {
            console.log(`Match found for ${file.name} with ${knownImage.name}`);
            //alert(`Match found for Google Drive image: ${file.name}`);
          } else {
            //alert(`No match found for Google Drive image: ${file.name}`);
            console.log(`Match not found for ${file.name} with ${knownImage.name}`);
          }
        }

        return { ...file, tempFilePath };
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
