import { createBrowserRouter } from "react-router";
import { AppLayout } from "../../components/layout/AppLayout";
import { CreateRoomScreen } from "../../screens/lobby/CreateRoomScreen";
import { GameScreen } from "../../screens/gameplay/GameScreen";
import { M01DemoScreen } from "../../screens/demo/M01DemoScreen";
import { HomeScreen } from "../../screens/onboarding/HomeScreen";
import { JoinRoomScreen } from "../../screens/lobby/JoinRoomScreen";
import { RoomScreen } from "../../screens/lobby/RoomScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: "create", element: <CreateRoomScreen /> },
      { path: "join", element: <JoinRoomScreen /> },
      { path: "room/:roomCode", element: <RoomScreen /> },
      { path: "game/:roomCode", element: <GameScreen /> },
      { path: "demo", element: <M01DemoScreen /> },
    ],
  },
]);
