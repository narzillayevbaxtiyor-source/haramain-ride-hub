import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

type UserTypeCardProps = {
  title: string;
  text: string;
  action: string;
  to: "/passenger" | "/driver";
  image: string;
  imageAlt: string;
  tone: "passenger" | "driver";
};

export function UserTypeCard({
  title,
  text,
  action,
  to,
  image,
  imageAlt,
  tone,
}: UserTypeCardProps) {
  return (
    <Link
      to={to}
      className="group relative grid min-h-[285px] overflow-hidden rounded-lg border p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[340px] sm:p-8"
      activeProps={{
        className:
          "group relative grid min-h-[285px] overflow-hidden rounded-lg border p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[340px] sm:p-8",
      }}
    >
      <div
        className={`absolute inset-0 ${
          tone === "passenger"
            ? "border-primary/15 bg-card"
            : "border-secondary-foreground/10 bg-secondary"
        }`}
      />

      <div className="relative z-10 max-w-[51%] self-start">
        <p className="font-display text-2xl font-bold text-card-foreground sm:text-3xl">
          {title}
        </p>

        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          {text}
        </p>
      </div>

      <img
        src={image}
        alt={imageAlt}
        loading="lazy"
        width={912}
        height={912}
        className="absolute bottom-[-10px] right-[-10px] h-[75%] w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03] sm:right-0"
      />

      <span className="relative z-10 mt-auto flex items-center gap-2 text-sm font-bold text-primary">
        {action}
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}
