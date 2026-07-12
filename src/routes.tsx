import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { OptionPage } from "@/pages/export/OptionPage";
import { SongPage } from "@/pages/convert/SongPage";
import { ChartPage } from "@/pages/convert/ChartPage";
import { JacketPage } from "@/pages/convert/JacketPage";
import { AudioPage } from "@/pages/convert/AudioPage";
import { StagePage } from "@/pages/convert/StagePage";
import { MusicExtractPage } from "@/pages/extract/MusicExtractPage";
import { ChartExtractPage } from "@/pages/extract/ChartExtractPage";
import { AudioExtractPage } from "@/pages/extract/AudioExtractPage";
import { StageExtractPage } from "@/pages/extract/StageExtractPage";
import { MiscPage } from "@/pages/system/MiscPage";
import { NotFoundPage } from "@/pages/system/NotFoundPage";
import { RouteErrorPage } from "@/pages/system/RouteErrorPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <Navigate to="/option" replace /> },
          { path: "option", element: <OptionPage /> },
          { path: "song", element: <SongPage /> },
          { path: "chart", element: <ChartPage /> },
          { path: "jacket", element: <JacketPage /> },
          { path: "audio", element: <AudioPage /> },
          { path: "stage", element: <StagePage /> },
          { path: "extract/music", element: <MusicExtractPage /> },
          { path: "extract/chart", element: <ChartExtractPage /> },
          { path: "extract/audio", element: <AudioExtractPage /> },
          { path: "extract/stage", element: <StageExtractPage /> },
          { path: "misc", element: <MiscPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
