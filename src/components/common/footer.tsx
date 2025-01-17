import { cn } from "@/lib/utils";

const Footer = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"footer">) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn("my-4 md:mb-10 px-4 text-center text-gray-500", className)}
      {...props}
    >
      <small className="mb-2 block text-xs">
        &copy; {currentYear} Minh. All rights reserved.
      </small>
      <p className="text-xs">
        <span className="font-semibold">About this website:</span> built with
        React & Next.js (App Router & Server Actions), TypeScript, Tailwind CSS,
        Framer Motion, React Email & Resend, Vercel hosting.
      </p>
    </footer>
  );
};

export default Footer;
