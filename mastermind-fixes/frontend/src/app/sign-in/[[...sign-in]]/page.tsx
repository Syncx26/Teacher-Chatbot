import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <SignIn />
    </div>
  );
}
