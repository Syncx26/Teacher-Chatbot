import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <SignUp />
    </div>
  );
}
