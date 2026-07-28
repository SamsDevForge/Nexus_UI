import Image from "next/image";

export function NexusNotesMark({
  className = "",
  size = 24,
  eager = false,
}: {
  className?: string;
  size?: number;
  eager?: boolean;
}) {
  return (
    <span
      className={["nexus-notes-mark", className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <Image
        src="/nexus-notes-logo.svg"
        alt=""
        width={size}
        height={Math.round((size * 302) / 324)}
        sizes={`${size}px`}
        loading={eager ? "eager" : undefined}
        unoptimized
      />
    </span>
  );
}
