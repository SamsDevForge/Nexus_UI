import Image from "next/image";

type InterfaceAssetKind = "download" | "upload" | "email" | "file" | "folder";

const sourceByKind: Record<InterfaceAssetKind, string> = {
  download: "/icon-transfer.svg",
  upload: "/icon-transfer.svg",
  email: "/icon-email.svg",
  file: "/icon-file.svg",
  folder: "/icon-folder.svg",
};

export function InterfaceAssetIcon({
  kind,
  className = "",
  size = 24,
}: {
  kind: InterfaceAssetKind;
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={["interface-asset-icon", `is-${kind}`, className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <Image
        src={sourceByKind[kind]}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        unoptimized
      />
    </span>
  );
}
