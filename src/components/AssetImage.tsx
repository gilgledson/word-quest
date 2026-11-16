import type { ImgHTMLAttributes } from "react";
import { useAsset } from "../content/assets";

/**
 * `<img>` de uma imagem do conteúdo: a do app sai direto; a do servidor vem do cache do aparelho
 * (ou é baixada na primeira vez). Até ela chegar vale `fallback`; sem fallback, nada é desenhado.
 */
export function AssetImage({
  src,
  fallback,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | undefined;
  fallback?: string;
}) {
  const shown = useAsset(src, fallback);
  return shown ? <img {...props} src={shown} /> : null;
}
