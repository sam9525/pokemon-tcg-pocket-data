import Image, { ImageProps } from "next/image";
import React from "react";

type CardImageVariant = "thumbnail" | "card" | "thumbnailCard";

interface CardImageProps extends Omit<ImageProps, "width" | "height" | "src"> {
  src: string;
  variant: CardImageVariant;
  width?: number;
  height?: number;
}

export default function CardImage({
  src,
  variant,
  alt,
  className,
  width,
  height,
  ...props
}: CardImageProps) {
  let sizes = "100vw";
  let defaultWidth = 360;
  let defaultHeight = 500;

  switch (variant) {
    case "thumbnail":
      // Target 150w
      sizes = "(max-width: 870px) 180px, 360px";
      defaultWidth = 32;
      defaultHeight = 32;
      break;
    case "card":
      // Target 180w and 360w
      sizes = "(max-width: 870px) 180px, 360px";
      defaultWidth = 200;
      defaultHeight = 280;
      break;
    case "thumbnailCard":
      // Target 180w
      sizes = "180px";
      defaultWidth = 50;
      defaultHeight = 50;
      break;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || defaultWidth}
      height={height || defaultHeight}
      sizes={sizes}
      className={className}
      {...props}
    />
  );
}
