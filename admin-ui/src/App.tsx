import { Toaster } from "sileo";
import { AdminNotes } from "./admin-notes";

export default function App() {
  return (
    <>
      <Toaster position="top-right" theme="light" />
      <AdminNotes />
    </>
  );
}
