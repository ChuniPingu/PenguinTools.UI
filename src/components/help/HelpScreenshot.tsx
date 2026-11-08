import { ZoomInIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function HelpScreenshot({
  src,
  alt,
  className,
}: Readonly<{ src: string; alt: string; className?: string }>) {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger
        aria-label={t("ui.help.enlargeImage")}
        className="relative block w-full cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <img
          src={src}
          alt={alt}
          className={cn("max-h-40 w-full rounded-lg border object-contain object-top", className)}
        />
        <span className="absolute right-1 bottom-1 rounded-sm bg-popover/90 p-1 text-popover-foreground">
          <ZoomInIcon className="size-4" aria-hidden="true" />
        </span>
      </DialogTrigger>
      <DialogContent className="w-fit max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)]">
        <DialogTitle className="pr-8">{t("ui.help.imageTitle")}</DialogTitle>
        <img
          src={src}
          alt={alt}
          className="mx-auto max-h-[calc(100dvh-8rem)] max-w-[calc(100vw-4rem)] object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
