import { createBrowserRouter } from "react-router";
import Root from "./components/Root";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import BoxManagement from "./pages/BoxManagement";
import StageMap from "./pages/StageMap";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "inventory", Component: Inventory },
      { path: "boxes", Component: BoxManagement },
      { path: "stage-map", Component: StageMap },
    ],
  },
]);
