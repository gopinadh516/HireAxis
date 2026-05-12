import Link from "next/link";
import { BriefcaseIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary shadow-sm">
          <BriefcaseIcon className="size-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold tracking-tight">HireAxis</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Sign in as</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your role to continue
        </p>

        <div className="mt-6 space-y-3">
          <Link href="/manager" className="block">
            <Button variant="outline" className="w-full justify-between h-12 px-4">
              <div className="text-left">
                <p className="text-sm font-medium">Manager</p>
                <p className="text-xs text-muted-foreground">Review &amp; approve jobs</p>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground" />
            </Button>
          </Link>

          <Link href="/recruiter" className="block">
            <Button variant="outline" className="w-full justify-between h-12 px-4">
              <div className="text-left">
                <p className="text-sm font-medium">Recruiter</p>
                <p className="text-xs text-muted-foreground">Search &amp; source candidates</p>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground" />
            </Button>
          </Link>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        India&apos;s first AI-powered hiring workflow
      </p>
    </div>
  );
}
