import Image, { type ImageLoaderProps, type ImageProps } from "next/image";

const DEFAULT_QUALITY = 72;

function optimizedPhotoLoader({ src, width, quality }: ImageLoaderProps): string {
  const url = new URL(src, "https://theracity.local");
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? DEFAULT_QUALITY));
  return `${url.pathname}${url.search}`;
}

type OptimizedPhotoProps = Omit<ImageProps, "loader" | "src"> & {
  alt: string;
  src: string;
};

export default function OptimizedPhoto(props: OptimizedPhotoProps) {
  return (
    // next/image receives alt via the wrapper props, but eslint cannot infer it here.
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      {...props}
      loader={optimizedPhotoLoader}
      quality={props.quality ?? DEFAULT_QUALITY}
    />
  );
}
