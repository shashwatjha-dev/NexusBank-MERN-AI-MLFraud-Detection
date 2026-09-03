import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { Toaster } from "./components/common/Toaster.jsx";
import { AppRouter } from "./router/AppRouter.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRouter />
          <Toaster />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}