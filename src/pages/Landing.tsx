"use client";

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  ArrowRight,
  PenTool,
  Video,
  Sparkles,
  ExternalLink,
  Zap,
} from "lucide-react";

import { useSEO } from "@/hooks/useSEO";

/* =======================
   Motion Variants
======================= */

const badgeParentVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: "easeOut" },
  },
  hover: { scale: 1.04 },
};

const iconPulseVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.15,
    transition: {
      duration: 0.4,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse",
    },
  },
};

/* =======================
   Data
======================= */

const competitions = [
  {
    title: "Blog Competition",
    description:
      "Publish original insights on trading, psychology, and market structure. Quality is rewarded.",
    icon: PenTool,
    href: "/blog",
    status: "active",
  },
  {
    title: "Reel Competition",
    description:
      "Create short-form educational content that simplifies trading for the community.",
    icon: Video,
    href: "/reels",
    status: "coming-soon",
  },
  {
    title: "Quiz Challenge",
    description:
      "Compete through structured trading knowledge challenges and rankings.",
    icon: Sparkles,
    href: "#",
    status: "coming-soon",
  },
];

/* =======================
   Helpers
======================= */

const scrollToArena = () => {
  const el = document.getElementById("choose-your-arena");
  el?.scrollIntoView({ behavior: "smooth" });
};

/* =======================
   Component
======================= */

export default function Landing() {
  useSEO();

  const heroRef = useRef<HTMLDivElement>(null);
  const competitionsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    document
      .querySelectorAll(".reveal-on-scroll")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0a] text-white">
      {/* ===== Background ===== */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0c0c0c] to-[#101010]" />
        <div
          className="absolute inset-0 opacity-[0.025] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
          }}
        />
      </div>

      <div className="relative z-10 pt-16">
        <Navbar />

        {/* ===== HERO ===== */}
        <section ref={heroRef} className="relative py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
              {/* Badge */}
              <motion.div
                variants={badgeParentVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-3 py-1.5 text-sm font-medium text-white/80 group overflow-hidden"
              >
                <div className="absolute inset-0 -translate-x-full transition-transform duration-700 group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                <motion.div
                  variants={iconPulseVariants}
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                  className="relative z-10"
                >
                  <Zap className="h-4 w-4 text-blue-300" />
                </motion.div>

                <span className="relative z-10 text-[11px] tracking-[0.32em] uppercase text-white/70">
                  PropScholar Space
                </span>
              </motion.div>

              {/* Heading */}
              <h1 className="reveal-on-scroll text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight mb-6">
                You Compete. <span className="font-semibold">We Reward.</span>
              </h1>

              {/* Subtext */}
              <p className="reveal-on-scroll text-sm md:text-base text-white/60 max-w-lg mx-auto leading-relaxed font-light mb-10">
                PropScholar’s giveaway hub where participants compete and win
                real rewards.
              </p>

              {/* CTAs */}
              <div className="reveal-on-scroll flex flex-wrap justify-center gap-4">
                <Button
                  onClick={scrollToArena}
                  className="h-11 px-9 rounded-full bg-white/90 text-black hover:bg-white"
                >
                  Explore Competitions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <a
                  href="https://propscholar.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="h-11 px-9 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                  >
                    Visit PropScholar
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ===== COMPETITIONS ===== */}
        <section
          ref={competitionsRef}
          id="choose-your-arena"
          className="py-28 md:py-36"
        >
          <div className="container mx-auto px-4">
            <div className="text-center mb-24">
              <h2 className="reveal-on-scroll text-3xl md:text-4xl font-semibold mb-4">
                Choose Your Arena
              </h2>
              <p className="reveal-on-scroll text-white/60 text-sm">
                Multiple formats. One standard of excellence.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
              {competitions.map((c, i) => {
                const coming = c.status === "coming-soon";

                return (
                  <Link
                    key={c.title}
                    to={coming ? "#" : c.href}
                    onClick={(e) => coming && e.preventDefault()}
                    className={`reveal-on-scroll ${
                      coming ? "cursor-not-allowed" : ""
                    }`}
                    style={{ transitionDelay: `${(i + 2) * 100}ms` }}
                  >
                    <Card className="relative h-full bg-[#111]/80 backdrop-blur-xl border border-white/10 hover:bg-[#161616] transition-all">
                      {coming && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-2xl z-10">
                          <Badge className="px-5 py-2 bg-white/10 text-white/80 border border-white/20 text-xs uppercase tracking-widest">
                            Coming Soon
                          </Badge>
                        </div>
                      )}

                      <CardContent className="p-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8">
                          <c.icon className="w-6 h-6 text-white/70" />
                        </div>

                        <h3 className="text-lg font-medium mb-4">
                          {c.title}
                        </h3>

                        <p className="text-white/50 text-sm">
                          {c.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section ref={ctaRef} className="py-32 md:py-40">
          <div className="container mx-auto px-4 text-center">
            <Card className="reveal-on-scroll bg-[#111]/80 backdrop-blur-xl border border-white/10 max-w-2xl mx-auto">
              <CardContent className="p-16 md:p-20">
                <h2 className="text-2xl md:text-3xl font-semibold mb-6">
                  Ready to Compete?
                </h2>
                <p className="text-white/50 text-sm mb-12">
                  Performance deserves visibility. Step into the arena.
                </p>

                <Button
                  onClick={scrollToArena}
                  className="h-12 px-12 rounded-full bg-white text-black hover:bg-white/90"
                >
                  Start Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <Footer />
      </div>

      {/* Reveal animation */}
      <style>{`
        .reveal-on-scroll {
          opacity: 0;
          filter: blur(8px);
          transform: translateY(20px);
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .reveal-visible {
          opacity: 1;
          filter: blur(0);
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
