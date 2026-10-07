import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Home } from "@/pages/Home";
import NotFound from "@/pages/not-found";

const ConflictAnalysisPageRoute = lazy(() =>
  import("@/components/ConflictAnalysisPage").then((m) => ({
    default: m.ConflictAnalysisPageRoute,
  })),
);

const queryClient = new QueryClient();

function Router() {
  return (
    <Suspense fallback={<p role="status" style={{ padding: "96px 24px", textAlign: "center" }}>Loading…</p>}>
      <Switch>
        <Route path="/analysis" component={ConflictAnalysisPageRoute} />
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}> 
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
