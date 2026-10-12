import { AdminNotes } from "./admin";
import { ConfirmProvider, Toaster } from "./ui";

export default function App() {
  return (
    <ConfirmProvider>
      <Toaster />
      <AdminNotes />
    </ConfirmProvider>
  );
}
