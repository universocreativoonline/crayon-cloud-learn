import manifest from "./silhouette-manifest.json";

/**
 * Listado de siluetas disponibles en build time.
 * Filtra el juego "¿Quién soy?" para que nunca se vea el ícono roto.
 */
export const SILHOUETTE_URLS = new Set<string>(manifest);

export function hasSilhouette(drawingLineArtPath: string | null | undefined): boolean {
  if (!drawingLineArtPath) return false;
  const silPath = drawingLineArtPath.replace("line-art/", "silhouettes/");
  return SILHOUETTE_URLS.has("/" + silPath.replace(/^\/+/, ""));
}
