"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAudity } from "@/context/audity-context";

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    authUser,
    authLoading,
  } = useAudity();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
      await register(name, email, password, phone);

      router.push("/login?registered=true");
    } catch (err) {
      setError(err.message || "Registration failed");
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
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-900 rounded-xl p-8 shadow-xl">

        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Audity
          </h1>

          <p className="mt-2 text-zinc-400">
            Create your attendee account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm text-zinc-300"
            >
              Name
            </label>

            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-400"
              placeholder="Your name"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm text-zinc-300"
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
              htmlFor="phone"
              className="mb-2 block text-sm text-zinc-300"
            >
              Phone
              <span className="ml-1 text-zinc-500">
                (optional)
              </span>
            </label>

            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-400"
              placeholder="Phone number"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm text-zinc-300"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-400"
              placeholder="Minimum 8 characters"
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
            {submitting ? "Creating account..." : "Create account"}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-yellow-400 hover:text-yellow-300"
          >
            Sign in
          </Link>
        </p>

      </div>
    </main>
  );
}