"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAudity } from "@/context/audity-context";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const {
    login,
    authUser,
    authLoading,
  } = useAudity();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && authUser) {
      router.replace("/");
    }
  }, [authLoading, authUser, router]);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">Loading Audity...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-900 rounded-xl p-8 shadow-xl">

        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Audity
          </h1>

          <p className="text-zinc-400 mt-2">
            Sign in to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label
              htmlFor="email"
              className="block text-sm mb-2 text-zinc-300"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm mb-2 text-zinc-300"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-400"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-yellow-400 px-4 py-3 font-semibold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>

        </form>
        <p className="mt-6 text-center text-sm text-zinc-400">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-yellow-400 hover:text-yellow-300"
          >
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}