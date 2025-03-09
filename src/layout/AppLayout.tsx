import {Outlet} from "react-router-dom";

export const AppLayout = () => {
  return (
    <div className="w-full h-full min-h-dvh max-h-dvh overflow-hidden flex flex-col">
      <Outlet />
    </div>
  );
};
