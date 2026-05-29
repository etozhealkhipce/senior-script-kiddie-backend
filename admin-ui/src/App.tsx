import { Toaster } from "sileo";
import { AdminNotes } from "./admin";

export default function App() {
  return (
    <>
      <Toaster position="top-right" theme="light" />
      <AdminNotes />
    </>
  );
}
