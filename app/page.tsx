import Hero from "./components/home/Hero";
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
      <ContentPillars />
      <LatestPosts />
      <PodcastSection />
      <CommunityPreview />
      <ResourcesSection />
      <NewsletterSection />
    </>
  );
}
