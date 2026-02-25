import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Import Pages
import CapturePage from "@/pages/capture";
import GalleryPage from "@/pages/gallery";
import AccessoryPage from "@/pages/accessory";
import { NavigationBar } from "@/components/navigation-bar";

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={CapturePage} />
        <Route path="/gallery" component={GalleryPage} />
        <Route path="/accessory" component={AccessoryPage} />
        <Route component={NotFound} />
      </Switch>
      <NavigationBar />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
