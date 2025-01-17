"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { NavComponent } from "@/lib/types";
import { useActiveSectionContext } from "@/context/active-section-context";

interface NavbarProps extends React.ComponentPropsWithoutRef<"nav"> {
  links: NavComponent[];
}

const Navbar = ({ links, className, ...props }: NavbarProps) => {
  const { activeSection, setActiveSection, setTimeOfLastClick } =
    useActiveSectionContext();

  return (
    <nav
      className={cn(
        "flex fixed top-[0.15rem] left-1/2 h-12 -translate-x-1/2 py-2 sm:top-[1.7rem] sm:h-[initial] sm:py-0",
        className
      )}
      {...props}
    >
      <ul className="flex w-[22rem] flex-wrap items-center justify-center gap-y-1 text-[0.9rem] font-medium text-gray-500 sm:w-[initial] sm:flex-nowrap sm:gap-5">
        {links.map((link) => (
          <motion.li
            className="h-3/4 flex items-center justify-center relative"
            key={link.hash}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Link
              className={cn(
                "flex w-full items-center justify-center px-3 py-3 hover:text-gray-950 transition dark:text-gray-500 dark:hover:text-gray-300",
                {
                  "text-gray-950 dark:text-gray-200":
                    activeSection === link.name,
                }
              )}
              href={link.hash}
              onClick={() => {
                setActiveSection(link.name);
                setTimeOfLastClick(Date.now());
              }}
            >
              {link.name}

              {link.name === activeSection && (
                <motion.span
                  className="bg-gray-100 rounded-full absolute inset-0 -z-10 dark:bg-gray-800"
                  layoutId="activeSection"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                  }}
                />
              )}
            </Link>
          </motion.li>
        ))}
      </ul>
    </nav>
  );
};

export default React.memo(Navbar);
