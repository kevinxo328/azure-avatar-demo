import {hexToRgb} from "@/utils/utils";
import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  memo,
  useState,
} from "react";

type Props = {
  src?: string | MediaStream;
  width?: string;
  height?: string;
  className?: string;
  backgroundColor?: string;
  poster: string;
  threshold?: number;
  position?: "center" | "top" | "bottom";
  onPlayPause?: () => void;
  onPlayEnd?: () => void;
  onUpdatePlaying?: (isPlaying: boolean) => void;
};

export type PlayerRef = {
  video: HTMLVideoElement | null;
  audio: HTMLAudioElement | null;
};

export const BgRemovePlayer = memo(
  forwardRef<PlayerRef, Props>(
    (
      {
        src,
        width = "100%",
        height = "100%",
        className = "",
        backgroundColor = "#00FF00",
        poster,
        threshold = 10,
        position = "center",
        onPlayPause,
        onPlayEnd,
        onUpdatePlaying,
      },
      ref
    ) => {
      const videoRef = useRef<HTMLVideoElement>(null);
      const audioRef = useRef<HTMLAudioElement>(null);
      const imageRef = useRef<HTMLImageElement>(null);
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const [isPlaying, setIsPlaying] = useState(false);
      const positionClass =
        position === "center"
          ? "object-center"
          : position === "top"
          ? "object-top"
          : "object-bottom";

      useImperativeHandle(ref, () => ({
        video: videoRef.current,
        audio: audioRef.current,
      }));

      useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const image = imageRef.current;
        const ctx = canvas?.getContext("2d", {
          willReadFrequently: true,
        });

        if (typeof src === "string" && video) {
          video.src = src;
          video.srcObject = null;
        } else if (src instanceof MediaStream && video) {
          video.srcObject = src;
          video.src = "";
        }

        const playHandler = () => {
          if (!video || !canvas || !ctx) return;
          // set canvas size to video size
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const render = () => {
            if (video.paused) {
              console.log("video paused");
              setIsPlaying(false);
              if (ctx) {
                if (image) {
                  canvas.width = image.width;
                  canvas.height = image.height;
                  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                } else {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
              }
              if (onPlayPause) onPlayPause();
              return;
            }
            if (video.ended) {
              console.log("video ended");
              setIsPlaying(false);
              if (onPlayEnd) onPlayEnd();
              return;
            }
            setIsPlaying(true);

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const length = frame.data.length;

            const bgColor = hexToRgb(backgroundColor);

            for (let i = 0; i < length; i += 4) {
              const r = frame.data[i];
              const g = frame.data[i + 1];
              const b = frame.data[i + 2];

              if (
                Math.abs(r - bgColor.r) < threshold &&
                Math.abs(g - bgColor.g) < threshold &&
                Math.abs(b - bgColor.b) < threshold
              ) {
                frame.data[i + 3] = 0;
              }
            }
            ctx.putImageData(frame, 0, 0);
            requestAnimationFrame(render);
          };

          render();
        };

        if (video && canvas && ctx) {
          video.addEventListener("play", playHandler);
        }

        return () => {
          if (video && canvas && ctx) {
            video.removeEventListener("play", playHandler);
          }
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [src, threshold, backgroundColor]);

      useEffect(() => {
        if (canvasRef.current !== null && imageRef.current !== null) {
          // render poster image before video starts
          const ctx = canvasRef.current.getContext("2d");
          const image = imageRef.current;

          if (ctx && image) {
            image.onload = () => {
              // set canvas size to image size
              canvasRef.current!.width = image.width;
              canvasRef.current!.height = image.height;

              ctx.drawImage(
                image,
                0,
                0,
                canvasRef.current!.width,
                canvasRef.current!.height
              );
            };
          }
        }
      }, [src]);

      useEffect(() => {
        if (onUpdatePlaying) onUpdatePlaying(isPlaying);
      }, [isPlaying, onUpdatePlaying]);

      return (
        <div className={`relative ${className}`} style={{width, height}}>
          <video
            ref={videoRef}
            autoPlay
            className={`absolute top-0 left-0 w-full h-full object-cover ${positionClass}`}
            crossOrigin="anonymous"
            hidden
          />
          <audio ref={audioRef} className="hidden"></audio>
          <img
            ref={imageRef}
            src={poster}
            alt="video poster"
            className={`absolute top-0 left-0 w-full h-full object-cover hidden ${positionClass}`}
            draggable={false}
          />
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={`absolute top-0 left-0 w-full h-full object-cover ${positionClass}`}
          />
        </div>
      );
    }
  )
);

export default BgRemovePlayer;
