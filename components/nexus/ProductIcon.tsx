import Image from "next/image";
import type { CSSProperties } from "react";

export const productIconPaths = {
  internet: "/icon-library/internet.svg",
  "internet-social": "/icon-library/internet-social.svg",
  "internet-social-12": "/icon-library/internet-social-12.svg",
  github: "/icon-library/github.svg",
  "github-alt": "/icon-library/github-alt.svg",
  "atom-editor": "/icon-library/atom-editor.svg",
  "date-down": "/icon-library/date-down.svg",
  "date-cross": "/icon-library/date-cross.svg",
  "date-calendar": "/icon-library/date-calendar.svg",
  "date-search": "/icon-library/date-search.svg",
  "date-right": "/icon-library/date-right.svg",
  "date-chart": "/icon-library/date-chart.svg",
  "date-up": "/icon-library/date-up.svg",
  "date-star": "/icon-library/date-star.svg",
  "date-check": "/icon-library/date-check.svg",
  "date-forward": "/icon-library/date-forward.svg",
  "date-favorite": "/icon-library/date-favorite.svg",
  "date-double-check": "/icon-library/date-double-check.svg",
  "folder-code": "/icon-library/folder-code.svg",
  code: "/icon-library/code.svg",
  "code-sandbox": "/icon-library/code-sandbox.svg",
  scissors: "/icon-library/scissors.svg",
  save: "/icon-library/save.svg",
  "music-player": "/icon-library/music-player.svg",
  "app-store": "/icon-library/app-store.svg",
  android: "/icon-library/android.svg",
} as const;

export type ProductIconName = keyof typeof productIconPaths;

export function timelineStatusIcon(status: string): ProductIconName {
  switch (status) {
    case "confirmed":
      return "date-check";
    case "inferred":
      return "date-chart";
    case "suggested":
      return "date-star";
    case "pending-approval":
      return "date-favorite";
    case "completed":
    case "accepted":
      return "date-double-check";
    case "missed":
    case "rejected":
      return "date-cross";
    case "at-risk":
      return "date-down";
    case "rescheduled":
      return "date-forward";
    default:
      return "date-calendar";
  }
}

export function ProductIcon({
  name,
  size = 20,
  className,
}: {
  name: ProductIconName;
  size?: number;
  className?: string;
}) {
  const style = {
    "--product-icon-size": `${size}px`,
  } as CSSProperties;

  return (
    <span
      className={["product-icon", `is-${name}`, className]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-hidden="true"
    >
      <Image
        src={productIconPaths[name]}
        alt=""
        width={size}
        height={size}
        unoptimized
      />
    </span>
  );
}
