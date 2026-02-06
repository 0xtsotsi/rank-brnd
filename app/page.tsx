import Link from 'next/link';
import { SignInButton, SignUpButton } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to Rank.brnd
        </h1>
        <p className="text-center text-lg mb-12 text-gray-600">
          AI-Powered SEO Automation Platform
        </p>

        <div className="flex gap-4 justify-center">
          <SignInButton mode="modal">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      </div>
    </main>
  );
}
