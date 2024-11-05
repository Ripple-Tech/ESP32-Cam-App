import Image from "next/image";
import {oauth2Client} from '@/utils/google-auth'
import Link from "next/link";
export default function Home() {
  const SCOPE = ["https://www.googleapis.com/auth/drive.readonly"]
  const authorizationURL = oauth2Client.generateAuthUrl({
     access_type: "offline",
     scope: SCOPE,
  })
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <Link href={authorizationURL} >
         <button>Login</button>
        </Link>
      </main>
    </div>
  );
}
