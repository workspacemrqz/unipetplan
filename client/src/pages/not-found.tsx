import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted">
      <Card className="w-full max-w-md mx-4 bg-background border-border">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-[var(--text-error)]" />
            <h1 className="text-2xl font-bold text-[var(--text-dark-primary)]">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-[var(--text-dark-secondary)]">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
