import Image from "next/image";

const words = ["Find", "what's", "on.", "Get", "in."];

/**
 * Image-led hero. The photo settles from a slight zoom; the headline rises
 * in word by word. The bottom edge is cut on the logo's slant.
 *
 * The entrance uses CSS animations (see `animate-rise` / `animate-settle` in
 * globals.css), not JavaScript, so the headline is visible the moment the
 * HTML arrives, even on slow mobile data before any script has loaded.
 */
export function Hero({ imageUrl }: { imageUrl: string }) {
  return (
    <section className="crop-slant relative isolate min-h-[34rem] overflow-hidden bg-ink-950 text-white [--slant-crop:3.5rem] md:min-h-[40rem] md:[--slant-crop:6rem]">
      <div className="animate-settle absolute inset-0 -z-20">
        <Image
          src={imageUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_35%]"
        />
      </div>
      {/* Scrim: keeps white text readable on any photo. */}
      <div className="absolute inset-0 -z-10 bg-ink-1000/55" aria-hidden />
      <div
        className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-linear-to-t from-ink-1000/80 to-transparent"
        aria-hidden
      />

      <div className="mx-auto flex max-w-7xl flex-col px-4 pt-32 pb-40 md:px-8 md:pt-44 md:pb-52">
        <p className="animate-rise text-overline text-teal-300 [--delay:100ms]">
          Accra · Kumasi · Tema · Takoradi · Cape Coast
        </p>
        <h1 className="mt-4 max-w-4xl text-display-xl">
          {words.map((w, i) => (
            <span
              key={i}
              className="animate-rise mr-[0.22em] inline-block"
              style={{ "--delay": `${150 + i * 60}ms` } as React.CSSProperties}
            >
              {w}
            </span>
          ))}
        </h1>
        <p className="animate-rise mt-5 max-w-xl text-body-lg text-white/85 [--delay:500ms]">
          Concerts, conferences, church conventions and match days. Pay with MoMo and your
          ticket lands on your phone.
        </p>
      </div>
    </section>
  );
}
