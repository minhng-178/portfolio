"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { links } from "@/lib/data";
import Navbar from "./navbar";

const Header = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"header">) => {
  return (
    <header className={cn("z-[999] relative", className)} {...props}>
      <motion.div
        className="fixed top-0 left-1/2 h-[4.5rem] w-full rounded-none border border-white border-opacity-40 bg-white bg-opacity-80 shadow-lg shadow-black/[0.03] backdrop-blur-[0.5rem] sm:top-6 sm:h-[3.25rem] sm:w-[36rem] sm:rounded-full dark:bg-gray-950 dark:border-black/40 dark:bg-opacity-75"
        initial={{ y: -100, x: "-50%", opacity: 0 }}
        animate={{ y: 0, x: "-50%", opacity: 1 }}
      />
      <Navbar links={links} />
    </header>
  );
};

export default React.memo(Header);
