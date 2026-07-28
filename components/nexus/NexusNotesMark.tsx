import Image from "next/image";

export function NexusNotesMark({
  className = "",
  size = 24,
}: {
  className?: string;
  size?: number;
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
        height={size}
        sizes={`${size}px`}
        unoptimized
      />
    </span>
  );
}
