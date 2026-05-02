// Was force-dynamic during launch week (env vars were broken at build time).
// Now that env is stable, ISR with 60s revalidate cuts DB load dramatically —
// Google + casual visitors get cached HTML; the page rebuilds in the
// background once per minute. Featured/latest posts are not minute-sensitive.
export const revalidate = 60;

import Hero from "./components/home/Hero";
import FeaturedStory from "./components/home/FeaturedStory";
import ContentPillars from "./components/home/ContentPillars";
import LatestPosts from "./components/home/LatestPosts";
import PodcastSection from "./components/home/PodcastSection";
import CommunityPreview from "./components/home/CommunityPreview";
import ResourcesSection from "./components/home/ResourcesSection";
import NewsletterSection from "./components/home/NewsletterSection";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedStory />
      <ContentPillars />
      <NewsletterSection />
      <LatestPosts />
      <PodcastSection />
      <CommunityPreview />
      <ResourcesSection />
    </>
  );
}
