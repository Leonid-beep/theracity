import Image, { type ImageLoaderProps, type ImageProps } from "next/image";
import { getOptimizedPhotoUrl } from "@/app/ui/optimizedPhotoUrl";

const DEFAULT_QUALITY = 72;

function optimizedPhotoLoader({ src, width, quality }: ImageLoaderProps): string {
  return getOptimizedPhotoUrl(src, width, quality ?? DEFAULT_QUALITY);
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
