"use client";
import Intro from "@/components/common/intro";
import { ThemeToggle } from "@/components/common/theme-toggle";

export default function Home() {
  return (
    <main className="flex flex-col items-center px-4">
      <Intro />

      <ThemeToggle className="fixed bottom-5 right-5" />
    </main>
  );
}
