/**
 * Общий контракт рендереров заставки. ZipIntro отвечает за жест и прогресс,
 * рендерер — только за картинку. Чтобы подключить новую технику (видео, WebGL),
 * достаточно реализовать IntroRendererHandle и описать IntroArtwork.
 */
export interface IntroArtwork {
  /** Система координат кадра (viewBox). Кадр вписывается в экран по правилу contain. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Вертикальная линия молнии в координатах кадра. */
  zipX: number;
  zipTop: number;
  zipBottom: number;
}

export interface IntroRendererHandle {
  /**
   * @param progress раскрытие молнии 0..1
   * @param exit финальный уход половин / затухание 0..1
   */
  render(progress: number, exit: number): void;
}

export interface Fit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** То же правило, что у SVG preserveAspectRatio="xMidYMid meet". */
export function fitContain(box: { width: number; height: number }, art: IntroArtwork): Fit {
  const scale = Math.min(box.width / art.width, box.height / art.height);
  return { scale, offsetX: (box.width - art.width * scale) / 2, offsetY: (box.height - art.height * scale) / 2 };
}
