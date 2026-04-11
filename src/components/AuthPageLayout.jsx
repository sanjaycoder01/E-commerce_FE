/** Shared full-viewport shell for login / signup (ambient background + center column). */
export default function AuthPageLayout({ children }) {
  return (
    <div className="relative min-h-screen min-h-dvh overflow-hidden bg-zinc-950 px-4 py-10 sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(163,230,53,0.15),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-lime-500/10 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-sky-500/12 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(9,9,11,0.4)_100%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-[440px] items-center justify-center sm:min-h-[calc(100vh-8rem)]">
        <div className="w-full">{children}</div>
      </div>
    </div>
  )
}
