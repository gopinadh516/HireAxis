import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/post-job", "/apply"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths and static assets
  if (isPublic(pathname) || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Read role from user_metadata (set at account creation — avoids DB call)
  const role = session.user.user_metadata?.role as string | undefined;

  // super_admin can access all protected routes
  if (role === "super_admin") return response;

  // manager — /manager/* only
  if (role === "manager") {
    if (pathname.startsWith("/admin") || pathname.startsWith("/recruiter")) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/manager";
      return NextResponse.redirect(redirect);
    }
    return response;
  }

  // recruiter — /recruiter/* only
  if (role === "recruiter") {
    if (pathname.startsWith("/admin") || pathname.startsWith("/manager")) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/recruiter";
      return NextResponse.redirect(redirect);
    }
    return response;
  }

  // Role missing from JWT metadata (stale session before metadata was set) —
  // let the request through; the client-side auth context will handle it.
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
