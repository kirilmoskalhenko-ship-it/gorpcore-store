"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type Props = Omit<ImageProps, "src" | "alt"> & { src: string | undefined; alt: string; label?: string };

/** next/image + аккуратный плейсхолдер, если файл не найден или путь пуст. */
export function ProductImage({ src, alt, label, className, ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-surface text-center ${rest.fill ? "absolute inset-0" : ""} ${className ?? ""}`}
      >
        <span className="eyebrow px-4">{label ?? "Image coming soon"}</span>
      </div>
    );
  }
  return <Image src={src} alt={alt} className={className} onError={() => setFailed(true)} {...rest} />;
}
