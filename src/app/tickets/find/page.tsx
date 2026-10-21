import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { FindTickets } from "@/components/tickets/find-tickets";

export const metadata: Metadata = {
  title: "Find my tickets",
  description: "Get your Vesrace tickets back with the phone number or email you used.",
};

export default function FindTicketsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[70vh] max-w-lg px-4 pt-28 pb-20 md:pt-36">
        <FindTickets />
      </main>
      <SiteFooter />
    </>
  );
}
