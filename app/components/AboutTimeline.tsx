"use client";

import { useEffect, useRef } from "react";

const timelineItems = [
  {
    year: "Late\n2008",
    sub: "The idea",
    era: "pre",
    tag: "Pre-launch",
    title: "The conversations that started it",
    paragraphs: [
      "Joel Manzer had been blogging on Xanga for years — writing about his son's autism diagnosis, connecting with other parents doing the same, and noticing that the autism community online was scattered across a dozen platforms with no real center of gravity.",
      "In late 2008, discussions began with the Xanga team about building a dedicated home for that community inside their network. What would it stand for? Who would it serve? What did the people who needed it actually need? The Xanga team asked Joel to lead it. He said yes. Those conversations took a few months to become something real.",
    ],
  },
  {
    year: "May\n2009",
    sub: "Launch",
    era: "xanga",
    tag: "Xanga era",
    title: "Autisable launches",
    paragraphs: [
      'Autisable goes live in May 2009 as part of the Xanga.com network. The format is simple: a shared community space where anyone connected to autism can write, read, and find each other. The tagline — "real blogs from people tackling the puzzle of autism" — says exactly what it is.',
      "The triangle puzzle piece logo goes up. It represents community wholeness, pieces fitting together — not the incomplete picture some people assume it signals. That distinction matters, and it always has.",
      "Within months, About.com's Parenting Children with Special Needs names Autisable its site of the day. The community grows before anyone has a formal plan for growing it, because it turns out people were already looking for something like this.",
    ],
  },
  {
    year: "2009–\n2013",
    sub: "Growth years",
    era: "xanga",
    tag: "Xanga era",
    title: "Four years, a hundred bloggers, thirty thousand people a month",
    paragraphs: [
      "Over the next four years, Autisable grows into a platform with real reach. More than a hundred bloggers contribute regularly. National and international non-profits — including Autism Speaks, Autism Today, and the Autism Society of America — publish through it. Monthly traffic reaches over 30,000 unique visitors and more than 100,000 pageviews.",
      "People write about diagnosis days, IEP meetings that went sideways, sensory meltdowns in public places, the particular exhaustion of navigating a world that wasn't designed for their family, and occasionally something genuinely funny — because that's how you survive long-term. Autistic adults write about their own lives. Siblings write. Teachers write.",
      "Joel speaks at the Autism Today Leadership Conference. Professionals in the field begin recommending Autisable to families as one of the few community resources they trust enough to cite. Academic researchers start referencing posts from Autisable contributors in published work on autism.",
    ],
  },
  {
    year: "Late\n2013",
    sub: "Site goes dark",
    era: "gap",
    tag: "The gap begins",
    title: "Xanga collapses. The website goes down.",
    paragraphs: [
      "In 2013, Xanga announced it needed to raise $60,000 to survive its transition to a new model. It didn't reach that goal. By late 2013, the platform was unnavigable — and autisable.com went with it.",
      "Four years of posts, community writing, and content disappeared from the live web almost overnight.",
    ],
    notice:
      "During the downtime, messages came in asking where the site had gone and whether it was coming back — from parents, from therapists and professionals who had been directing families to Autisable as a trusted resource, and from autistic individuals who had found the community valuable. Autisable had quietly become part of how a portion of the field thought about community support online — and its absence was felt.",
  },
  {
    year: "2013–\n2016",
    sub: "Keeping the lights on",
    era: "social",
    tag: "Social media era",
    title: "The website was down. The community wasn't.",
    paragraphs: [
      "Autisable's social media presence stayed active throughout the gap — maintaining the community's voice, keeping the conversation going, and holding space for whenever the website could return.",
      "That continuity mattered more than it might seem. A community that goes completely quiet during a long absence is hard to bring back. One that keeps talking is a different thing to return to.",
    ],
  },
  {
    year: "2016",
    sub: "The comeback",
    era: "rebuild",
    tag: "WordPress era",
    title: "The site comes back — because people showed up to help",
    paragraphs: [
      "The relaunch of Autisable is not a polished corporate story. It's a story about people deciding something was worth saving and doing what they could to help save it.",
      "Rob Gorski of TheAutismDad.com provided server space to get the site back online. The Xanga team, despite their own collapse, handed over what they legally could — the domain and the main account data. Everything community-facing had to be rebuilt from scratch.",
      "It wasn't a dramatic relaunch. It was a lot of quiet work, a few people who showed up at the right moment, and a community that had been waiting for the door to open again.",
    ],
  },
  {
    year: "2016–\n2025",
    sub: "Independent era",
    era: "rebuild",
    tag: "WordPress era",
    title: "Nine years of independent publishing",
    paragraphs: [
      "Over nearly a decade, contributors write thousands of posts — travel guides for families navigating vacations with sensory needs, social stories parents can actually use, honest takes on how autism gets portrayed in film and television, practical content for the newly diagnosed still figuring out where to start.",
      "A post from 2010 about what to do when an autistic child is the one doing the bullying still ranks on the first page of Google and draws thousands of readers every year — because the search never stopped.",
      "The platform runs leaner than it probably should, maintained alongside a full-time job without institutional backing. The community keeps coming back anyway.",
    ],
  },
  {
    year: "2026",
    sub: "Partnership",
    era: "rebuild",
    tag: "New platform",
    title: "Two companies. One mission.",
    paragraphs: [
      "In 2026, Justin Bowman — founder of VizyPlan, a visual planning platform designed to help autistic individuals manage daily routines, transitions, and independence through visual schedules — connected with Joel about what it would take to rebuild Autisable the way it deserved to be built.",
      "It wasn't a sponsorship conversation. It was two companies that had been working in different corners of the same community recognizing they could do more together. VizyPlan brought the technical resources, development team, and operational support to make a ground-up rebuild possible. Autisable brought eighteen years of community trust, editorial voice, and direct access to the families, professionals, and autistic individuals who could help shape VizyPlan into the tool the community actually needs.",
      "The partnership works because it goes both ways. Autisable gets the infrastructure to become the platform it was always meant to be. VizyPlan gets a real connection to the community it was built to serve — feedback, visibility, and the kind of trust that only comes from being part of something people already believe in. Neither company could build what comes next alone. Together, the mission scales.",
    ],
  },
  {
    year: "2026",
    sub: "Right now",
    era: "now",
    tag: "New platform",
    title: "The rebuild. And what comes next.",
    paragraphs: [
      "Autisable relaunches on a new platform built to actually support a community at scale — real membership architecture, a genuine social feed, privacy controls that mean something, and no advertising inside the member experience. The eighteen-plus years of content is still here. The community is still here. The infrastructure is finally worthy of both.",
      "This isn't a rebranding. The name is the same, the mission is the same, the puzzle piece still represents wholeness. What changed is the foundation — and what that makes possible going forward.",
      "If you were here on Xanga and found your way back: welcome back. If you kept following on social during the years the site was down: thank you for not giving up on it. If you're new and found us through a search result from 2010: welcome. Either way, you're in the right place.",
    ],
  },
];

const eraStyles: Record<string, { dot: string; tag: string; yearColor: string }> = {
  pre: {
    dot: "border-zinc-400 border-dashed bg-white",
    tag: "bg-zinc-100 text-zinc-500",
    yearColor: "text-zinc-400",
  },
  xanga: {
    dot: "border-brand-blue bg-white",
    tag: "bg-brand-blue-light text-brand-blue",
    yearColor: "text-brand-blue",
  },
  gap: {
    dot: "border-zinc-400 bg-zinc-400",
    tag: "bg-zinc-100 text-zinc-500",
    yearColor: "text-zinc-400",
  },
  social: {
    dot: "border-zinc-400 bg-white",
    tag: "bg-zinc-100 text-zinc-500",
    yearColor: "text-zinc-400",
  },
  rebuild: {
    dot: "border-brand-green bg-white",
    tag: "bg-brand-green-light text-brand-green",
    yearColor: "text-brand-green",
  },
  now: {
    dot: "border-brand-green bg-brand-green !w-[11px] !h-[11px]",
    tag: "bg-brand-green-light text-brand-green",
    yearColor: "text-brand-green",
  },
};

export default function AboutTimeline() {
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-4");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    itemsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="max-w-[800px] mx-auto px-5 pb-24">
      <p className="font-serif text-[13px] tracking-[0.14em] uppercase text-zinc-400 mb-12 text-center">
        A platform history
      </p>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[120px] sm:left-[120px] top-0 bottom-0 w-px bg-zinc-200" style={{ left: "120px" }} />

        <div className="space-y-14">
          {timelineItems.map((item, i) => {
            const style = eraStyles[item.era] || eraStyles.xanga;
            return (
              <div
                key={i}
                ref={(el) => { itemsRef.current[i] = el; }}
                className="grid gap-x-10 relative opacity-0 translate-y-4 transition-all duration-500"
                style={{ gridTemplateColumns: "120px 1fr" }}
              >
                {/* Dot */}
                <div
                  className={`absolute w-[9px] h-[9px] rounded-full border-2 z-10 ${style.dot}`}
                  style={{ left: "116px", top: "6px" }}
                />

                {/* Year */}
                <div className="text-right pt-0.5">
                  <span className={`font-serif text-[22px] font-normal leading-none whitespace-pre-line ${style.yearColor}`}>
                    {item.year}
                  </span>
                  <span className="block text-[11px] text-zinc-400 tracking-wide mt-1">
                    {item.sub}
                  </span>
                </div>

                {/* Content */}
                <div>
                  <span className={`inline-block text-[10px] tracking-[0.1em] uppercase font-medium px-2 py-0.5 rounded-full mb-2.5 ${style.tag}`}>
                    {item.tag}
                  </span>
                  <h3 className="font-serif text-lg font-medium text-zinc-900 mb-2 leading-snug">
                    {item.title}
                  </h3>
                  {item.paragraphs.map((p, j) => (
                    <p key={j} className="text-[15px] leading-[1.8] text-zinc-500 mt-3 first:mt-0">
                      {p}
                    </p>
                  ))}
                  {item.notice && (
                    <div className="mt-4 border border-zinc-200 border-l-[3px] border-l-zinc-400 bg-zinc-50 rounded-r-md px-4 py-3.5 text-sm leading-[1.75] text-zinc-500 italic">
                      {item.notice}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
